import sys
from pathlib import Path
from ultralytics import YOLO

ROOT = Path(__file__).resolve().parents[1]
WEIGHTS = ROOT / "models" / "potholes" / "weights" / "best.pt"


def main():
    # Usage: python ml/src/infer.py <image|video|folder>
    source = sys.argv[1] if len(sys.argv) > 1 else str(ROOT / "data" / "raw")
    YOLO(str(WEIGHTS)).predict(source=source, save=True, conf=0.4)


if __name__ == "__main__":
    main()
