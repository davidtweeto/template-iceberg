import { CalculateMetadataFunction, Composition } from "remotion";
import { IcebergComposition, IcebergSchema, type IcebergProps } from "./Composition";
import { OUTRO_TOTAL_FRAMES, SETTLE_FRAMES } from "./constants";

const calculateMetadata: CalculateMetadataFunction<IcebergProps> = ({ props }) => ({
  durationInFrames:
    Math.round(
      (props.camera.introHoldSecs +
        props.camera.panDurationSecs +
        props.camera.zoomOutDurationSecs) *
        30,
    ) +
    SETTLE_FRAMES +
    Math.round(props.camera.outroHoldSecs * 30) +
    OUTRO_TOTAL_FRAMES,
});

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="Iceberg"
      component={IcebergComposition}
      fps={30}
      width={1080}
      height={1080}
      schema={IcebergSchema}
      defaultProps={{
        camera: {
          zoomLevel: 3,
          introHoldSecs: 2,
          panDurationSecs: 10,
          zoomOutDurationSecs: 1,
          outroHoldSecs: 1,
        },
        title: { text: "The Iceberg Model", titleY: 55, titleFontSize: 30 },
        labels: {
          tipText: "✅ What people see",
          point1: "🔍 Hidden factor one",
          point2: "🔍 Hidden factor two",
          point3: "🔍 Hidden factor three",
          point4: "🔍 Hidden factor four",
          point5: "🔍 Hidden factor five",
          point6: "🔍 Hidden factor six",
          point7: "🔍 Hidden factor seven",
          point8: "🔍 Hidden factor eight",
          watermark: "tweeto",
        },
        layout: { pointsStartY: 390, pointSpacing: 90, fontSize: 20, firstLabelFrame: 195 },
        backgroundFile: "iceberg.jpg",
        fontFamily: "Roboto" as const,
      }}
      calculateMetadata={calculateMetadata}
    />
  );
};
