from pathlib import Path
from ultralytics import YOLO

ROOT = Path(__file__).resolve().parents[1]
WEIGHTS = ROOT / "models" / "potholes" / "weights" / "best.pt"


def main():
    metrics = YOLO(str(WEIGHTS)).val(data=str(ROOT / "data" / "data.yaml"))
    print("mAP50-95:", metrics.box.map)
    print("mAP50   :", metrics.box.map50)
    # Inspect per-class precision/recall + confusion matrix in the run folder.


if __name__ == "__main__":
    main()
