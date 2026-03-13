# run this once to pre-download
from transformers import AutoFeatureExtractor, AutoModelForAudioClassification
AutoFeatureExtractor.from_pretrained("Gustking/wav2vec2-large-xlsr-deepfake-audio-classification")
AutoModelForAudioClassification.from_pretrained("Gustking/wav2vec2-large-xlsr-deepfake-audio-classification")
print("Downloaded and cached!")