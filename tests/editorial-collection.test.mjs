import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../lib/gallery-data.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } });
const { getEditorialCollection } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);

test("legacy community uploads and contributor verification do not imply a photo tag", () => {
  assert.equal(getEditorialCollection({}), "none");
  assert.equal(getEditorialCollection({ source: "community" }), "none");
  assert.equal(getEditorialCollection({ irisSnapVerified: true }), "none");
});
test("existing explicit LumiShutter choices are preserved", () => {
  assert.equal(getEditorialCollection({ lumiShutterChoice: true }), "lumishutter");
});
test("explicit selection including No tag overrides legacy fields", () => {
  for (const editorialCollection of ["none", "irissnap", "lumishutter"]) {
    assert.equal(getEditorialCollection({ editorialCollection, lumiShutterChoice: true }), editorialCollection);
  }
});
test("untagged photos stay in All/category views but neither editorial collection", () => {
  const photos = [{ source: "community" }, { editorialCollection: "irissnap" }, { lumiShutterChoice: true }];
  assert.equal(photos.filter(p => getEditorialCollection(p) === "irissnap").length, 1);
  assert.equal(photos.filter(p => getEditorialCollection(p) === "lumishutter").length, 1);
  assert.equal(photos.length, 3);
});
