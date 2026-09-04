export const RFQ_ATTACHMENT_TYPES = [
  "drawing",
  "specification",
  "boq",
  "photo",
  "addenda",
  "supporting",
] as const;

export type RfqAttachmentType = (typeof RFQ_ATTACHMENT_TYPES)[number];

export const RFQ_ATTACHMENT_TYPE_LABELS: Record<RfqAttachmentType, string> = {
  drawing: "Drawing",
  specification: "Specification",
  boq: "BOQ",
  photo: "Photo",
  addenda: "Addenda",
  supporting: "Supporting",
};

export const RFQ_ATTACHMENT_TYPE_FOLDER_LABELS: Record<
  RfqAttachmentType,
  string
> = {
  drawing: "Drawings",
  specification: "Specifications",
  boq: "BOQ / Bid Forms",
  photo: "Photos",
  addenda: "Addenda",
  supporting: "Supporting Documents",
};

export function isRfqAttachmentType(value: unknown): value is RfqAttachmentType {
  return RFQ_ATTACHMENT_TYPES.includes(value as RfqAttachmentType);
}
