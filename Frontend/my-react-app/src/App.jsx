import { useState } from "react";
import { Upload, Shield, Server, FileText, Brain } from "lucide-react";

function Card({ title, icon, children }) {
  return (
    <div className="bg-slate-800 rounded-2xl p-6 shadow-lg border border-slate-700">
      <div className="flex items-center gap-3 mb-4">
        {icon}
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      {children}
    </div>
  );
}

export default function App() {
  const [files, setFiles] = useState([]);
  const [analysisResult, setAnalysisResult] = useState(null);
  

  const handleFileChange = (event) => {
    const selectedFiles = Array.from(event.target.files);
    setFiles(selectedFiles);

    console.log("Selected Files:", selectedFiles);
  };

  const handleAnalyze = async () => {
    if (files.length === 0) {
      alert("Please select files first");
      return;
    }

    const formData = new FormData();

    files.forEach((file) => {
      formData.append("files", file);
    });

    try {
      const response = await fetch(
        "http://localhost:5555/analyze",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      console.log(data);
      setAnalysisResult(data);

      alert("Files uploaded successfully!");
    } catch (error) {
      console.error(error);
      alert("Upload failed");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Navbar */}
      <nav className="border-b border-slate-800 p-5 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-cyan-400">
          Terraform AI Reviewer
        </h1>

        <div className="bg-green-500/20 text-green-400 px-4 py-2 rounded-xl">
          Ready
        </div>
      </nav>

      {/* Hero Section */}
      <section className="p-8">
        <div className="bg-gradient-to-r from-cyan-600 to-blue-700 rounded-3xl p-8">
          <h2 className="text-4xl font-bold mb-3">
            Cloud Infrastructure Documentation & Review Agent
          </h2>

          <p className="text-lg text-slate-100 max-w-3xl">
            Upload Terraform code and receive architecture summaries,
            security findings, infrastructure inventory, and AI-generated
            recommendations.
          </p>
        </div>
      </section>

      {/* Upload Section */}
      <section className="px-8 mb-8">
        <div className="border-2 border-dashed border-slate-700 rounded-3xl p-10 text-center bg-slate-900">
          <Upload
            size={50}
            className="mx-auto text-cyan-400 mb-4"
          />

          <h3 className="text-xl font-semibold mb-2">
            Upload Terraform Project
          </h3>

          <p className="text-slate-400 mb-5">
            Select one or more Terraform files (.tf)
          </p>

          <input
            type="file"
            multiple
            accept=".tf"
            id="terraform-upload"
            className="hidden"
            onChange={handleFileChange}
          />

          <label
            htmlFor="terraform-upload"
            className="bg-cyan-500 hover:bg-cyan-600 px-6 py-3 rounded-xl font-medium cursor-pointer inline-block transition"
          >
            Select Files
          </label>
        </div>

        {files.length > 0 && (
          <div className="mt-6 bg-slate-900 rounded-2xl p-5 border border-slate-700">
            <h3 className="font-semibold text-lg text-cyan-400 mb-4">
              Selected Files ({files.length})
            </h3>

            <ul className="space-y-2">
              {files.map((file, index) => (
                <li
                  key={index}
                  className="bg-slate-800 px-4 py-3 rounded-lg flex justify-between items-center"
                >
                  <span>📄 {file.name}</span>

                  <span className="text-slate-400 text-sm">
                    {(file.size / 1024).toFixed(1)} KB
                  </span>
                </li>
              ))}
            </ul>

            <button
              onClick={handleAnalyze}
              className="mt-5 bg-green-600 hover:bg-green-700 px-6 py-3 rounded-xl font-medium transition"
            >
              Analyze Project
            </button>
          </div>
        )}
      </section>

      {/* Results */}
      <section className="grid lg:grid-cols-2 gap-6 px-8 pb-10">
        <Card
  title="Architecture Summary"
  icon={<FileText className="text-cyan-400" />}
>
  <p className="text-slate-300">
    {analysisResult?.summary ||
      "Upload Terraform files and the architecture summary will appear here."}
  </p>
</Card>

        <Card
          title="Security Findings"
          icon={<Shield className="text-red-400" />}
        >
          <ul className="space-y-2 text-slate-300">
            <li>Waiting for analysis...</li>
          </ul>
        </Card>

        <Card
          title="Infrastructure Inventory"
          icon={<Server className="text-green-400" />}
        >
          {analysisResult && (
  <p className="mb-4 text-cyan-400 font-semibold">
    Resources Found: {analysisResult.resourceCount}
  </p>
)}
          <ul className="space-y-2 text-slate-300">
            {analysisResult?.resources?.map((resource, index) => (
  <li key={index}>
    {resource.type} - {resource.name}
  </li>
))}
          </ul>
        </Card>

        <Card
          title="AI Recommendations"
          icon={<Brain className="text-purple-400" />}
        >
          <ul className="space-y-2 text-slate-300">
            <li>Recommendations will appear here.</li>
          </ul>
        </Card>
      </section>
    </div>
  );
}