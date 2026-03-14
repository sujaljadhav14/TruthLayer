import numpy as np
import torch
from PIL import Image
import cv2

# ── Face detection: try MediaPipe first, fall back to Haar cascade ──
_face_detector = None
_face_detect_method = None

try:
    import mediapipe as mp
    _mp_face = mp.solutions.face_detection.FaceDetection(
        model_selection=1, min_detection_confidence=0.5
    )
    _face_detect_method = "mediapipe"
    print("[VideoProcessor] Face detection: MediaPipe (high accuracy)")
except Exception:
    try:
        _face_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        )
        # Verify the cascade actually loaded (empty() returns True if NOT loaded)
        if _face_cascade.empty():
            _face_cascade = None
            print("[VideoProcessor] WARNING: Haar cascade failed to load")
        else:
            _face_detect_method = "haar"
            print("[VideoProcessor] Face detection: Haar cascade (basic)")
    except Exception:
        print("[VideoProcessor] WARNING: No face detection available!")


def detect_face(image_rgb: np.ndarray):
    """
    Detect the largest face in an RGB image.
    Returns (x, y, w, h) or None if no face found.
    """
    h_img, w_img = image_rgb.shape[:2]

    if _face_detect_method == "mediapipe":
        results = _mp_face.process(image_rgb)
        if results.detections:
            # Pick the detection with highest confidence
            best = max(results.detections, key=lambda d: d.score[0])
            bbox = best.location_data.relative_bounding_box
            x = int(bbox.xmin * w_img)
            y = int(bbox.ymin * h_img)
            w = int(bbox.width * w_img)
            h = int(bbox.height * h_img)
            return (x, y, w, h)

    elif _face_detect_method == "haar":
        gray = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2GRAY)
        faces = _face_cascade.detectMultiScale(
            gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30)
        )
        if len(faces) > 0:
            # Pick the largest face
            areas = [fw * fh for (_, _, fw, fh) in faces]
            idx = np.argmax(areas)
            return tuple(faces[idx])

    return None


class VideoProcessor:
    """Extracts and preprocesses video frames for the DeepFake detection model."""

    def __init__(self, im_size=112, mean=None, std=None):
        self.im_size = im_size
        self.mean = mean or [0.485, 0.456, 0.406]
        self.std = std or [0.229, 0.224, 0.225]

    def preprocess_frame(self, frame):
        if isinstance(frame, np.ndarray):
            frame = Image.fromarray(frame)
        frame = frame.resize((self.im_size, self.im_size))
        frame = np.array(frame).astype(np.float32) / 255.0
        frame = (frame - np.array(self.mean)) / np.array(self.std)
        frame = frame.transpose(2, 0, 1)  # HWC -> CHW
        return torch.tensor(frame, dtype=torch.float32)

    def extract_frames(self, video_path, sequence_length=20, extract_faces=True):
        frames = []
        face_frames = []  # frames where face was successfully detected
        full_frames = []  # raw frames as fallback

        vidObj = cv2.VideoCapture(video_path)

        if not vidObj.isOpened():
            raise RuntimeError(f"Cannot open video: {video_path}")

        total_frames = int(vidObj.get(cv2.CAP_PROP_FRAME_COUNT))
        if total_frames <= 0:
            # Unreliable frame count — read all frames first to count
            temp_frames = []
            while True:
                success, img = vidObj.read()
                if not success:
                    break
                temp_frames.append(img)
            vidObj.release()
            total_frames = len(temp_frames)
            if total_frames == 0:
                raise RuntimeError(f"No frames could be read from: {video_path}")
            interval = max(1, total_frames // sequence_length)
            raw_frames = [temp_frames[i] for i in range(0, total_frames, interval)][:sequence_length]
        else:
            interval = max(1, total_frames // sequence_length)
            raw_frames = []
            count = 0
            while len(raw_frames) < sequence_length:
                success, image = vidObj.read()
                if not success:
                    break
                if count % interval == 0:
                    raw_frames.append(image)
                count += 1
            vidObj.release()

        if len(raw_frames) == 0:
            raise RuntimeError(f"No frames extracted from: {video_path}")

        # Process each frame: detect face and crop
        face_count = 0
        last_face_box = None

        for bgr_frame in raw_frames:
            rgb = cv2.cvtColor(bgr_frame, cv2.COLOR_BGR2RGB)
            full_frames.append(rgb)

            if extract_faces and _face_detect_method is not None:
                face_box = detect_face(rgb)
                if face_box is not None:
                    last_face_box = face_box
                    face_count += 1

                # Use detected face or last known face position (temporal smoothing)
                box = face_box if face_box is not None else last_face_box
                if box is not None:
                    x, y, w, h = box
                    h_img, w_img = rgb.shape[:2]
                    padding = int(max(w, h) * 0.3)
                    top = max(0, y - padding)
                    bottom = min(h_img, y + h + padding)
                    left = max(0, x - padding)
                    right = min(w_img, x + w + padding)
                    cropped = rgb[top:bottom, left:right]
                    if cropped.size > 0:
                        face_frames.append(self.preprocess_frame(cropped))
                        continue

            # Fallback: use full frame
            face_frames.append(self.preprocess_frame(rgb))

        print(f"[VideoProcessor] Extracted {len(raw_frames)} frames, "
              f"face detected in {face_count}/{len(raw_frames)} frames "
              f"(method: {_face_detect_method or 'none'})")

        frames = face_frames

        # Pad to sequence_length if needed
        while len(frames) < sequence_length:
            frames.append(
                frames[-1] if frames else torch.zeros((3, self.im_size, self.im_size))
            )

        return torch.stack(frames[:sequence_length]).unsqueeze(0)  # (1, seq_len, 3, H, W)

    def __call__(self, video_path, **kwargs):
        sequence_length = kwargs.get("sequence_length", 20)
        extract_faces = kwargs.get("extract_faces", True)
        pixel_values = self.extract_frames(video_path, sequence_length, extract_faces)
        return {"pixel_values": pixel_values}
