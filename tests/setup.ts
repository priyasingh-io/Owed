import "@testing-library/jest-dom/vitest";
import { Blob as NodeBlob } from "node:buffer";

if (typeof File !== "undefined" && !File.prototype.arrayBuffer) {
  File.prototype.arrayBuffer = function () {
    return new NodeBlob([this as unknown as string]).arrayBuffer();
  };
}

if (typeof File !== "undefined" && !File.prototype.text) {
  File.prototype.text = function () {
    return new NodeBlob([this as unknown as string]).text();
  };
}

if (typeof URL !== "undefined" && !URL.createObjectURL) {
  URL.createObjectURL = () => "blob:http://localhost/mock-preview";
  URL.revokeObjectURL = () => {};
}
