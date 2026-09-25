import Workspace from "../../components/workspace/workspace";
import "./workspace.css";
import "./workbench.css";
import "./observatory.css";
import "./record.css";

export const metadata = {
  title: "Molecule Observatory — Scientific Workbench",
  description:
    "A local scientific workbench for tracing synthetic evidence, framing research questions and preserving reviewed briefs.",
};

export default function WorkspacePage() {
  return <Workspace />;
}
