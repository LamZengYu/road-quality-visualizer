from pathlib import Path
from ultralytics import YOLO

ROOT = Path(__file__).resolve().parents[1]
WEIGHTS = ROOT / "models" / "potholes" / "weights" / "best.pt"


def main():
    # TFLite for Android (your target). Use "onnx"/"coreml" for other runtimes.
    YOLO(str(WEIGHTS)).export(format="tflite")
    print("Exported. Move the .tflite into ml/models/exported/ and into the app.")


if __name__ == "__main__":
    main()
