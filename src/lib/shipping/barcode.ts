import JsBarcode from "jsbarcode";

export function barcodeSvgDataUrl(value: string): string {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  JsBarcode(svg, value, { format: "CODE128", displayValue: false, margin: 4, height: 52, width: 2 });
  const markup = new XMLSerializer().serializeToString(svg);
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
}

export function barcodeSvgElement(value: string): SVGSVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  JsBarcode(svg, value, { format: "CODE128", displayValue: false, margin: 4, height: 52, width: 2 });
  return svg;
}

export function renderBarcodeSvg(target: SVGSVGElement, value: string) {
  const generated = barcodeSvgElement(value);
  for (const attribute of Array.from(target.attributes)) target.removeAttribute(attribute.name);
  for (const attribute of Array.from(generated.attributes)) target.setAttribute(attribute.name, attribute.value);
  target.replaceChildren(...Array.from(generated.childNodes));
}

export function barcodePngDataUrl(value: string): string {
  const canvas = document.createElement("canvas");
  JsBarcode(canvas, value, { format: "CODE128", displayValue: false, margin: 4, height: 52, width: 2 });
  return canvas.toDataURL("image/png");
}