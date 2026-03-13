import numpy as np
import torch
from PIL import Image
import cv2

# Initialize OpenCV face detector
try:
    _face_cascade = cv2.CascadeClassifier(
        cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
    )
except Exception:
    _face_cascade = None


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
        vidObj = cv2.VideoCapture(video_path)
        total_frames = int(vidObj.get(cv2.CAP_PROP_FRAME_COUNT))
        interval = max(1, total_frames // sequence_length)

        count = 0
        success = True

        while success and len(frames) < sequence_length:
            success, image = vidObj.read()
            if success and count % interval == 0:
                image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

                if extract_faces and _face_cascade is not None:
                    gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
                    faces = _face_cascade.detectMultiScale(
                        gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30)
                    )
                    if len(faces) > 0:
                        x, y, w, h = faces[0]
                        padding = 40
                        h_img, w_img = image.shape[:2]
                        top = max(0, y - padding)
                        bottom = min(h_img, y + h + padding)
                        left = max(0, x - padding)
                        right = min(w_img, x + w + padding)
                        image = image[top:bottom, left:right]

                frames.append(self.preprocess_frame(image))
            count += 1

        vidObj.release()

        while len(frames) < sequence_length:
            frames.append(
                frames[-1] if frames else torch.zeros((3, self.im_size, self.im_size))
            )

        return torch.stack(frames).unsqueeze(0)  # (1, seq_len, 3, H, W)

    def __call__(self, video_path, **kwargs):
        sequence_length = kwargs.get("sequence_length", 20)
        extract_faces = kwargs.get("extract_faces", True)
        pixel_values = self.extract_frames(video_path, sequence_length, extract_faces)
        return {"pixel_values": pixel_values}
