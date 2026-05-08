import type { InputLengthBucketKey, InputLengthBucketMeta } from "@/lib/types";

export const FALLBACK_INPUT_LENGTH_BUCKET_META: InputLengthBucketMeta[] = [
  { key: "short", label: "\u77ed\u6587\u672c", min_tokens: 0, max_tokens: 4096, description: "<= 4k tokens" },
  { key: "medium", label: "\u4e2d\u6587\u672c", min_tokens: 4097, max_tokens: 16384, description: "4k ~ 16k tokens" },
  { key: "long", label: "\u957f\u6587\u672c", min_tokens: 16385, max_tokens: null, description: "> 16k tokens" }
];

export function getInputLengthBucketMeta(
  bucketMeta?: InputLengthBucketMeta[] | null
): InputLengthBucketMeta[] {
  return bucketMeta && bucketMeta.length > 0 ? bucketMeta : FALLBACK_INPUT_LENGTH_BUCKET_META;
}

export function getInputLengthBucketLabel(
  bucket: string | null | undefined,
  bucketMeta?: InputLengthBucketMeta[] | null,
  emptyLabel = "\u5168\u90e8\u6587\u672c"
): string {
  if (!bucket) return emptyLabel;
  const meta = getInputLengthBucketMeta(bucketMeta).find((item) => item.key === bucket);
  return meta?.label ?? bucket;
}

export function getInputLengthBucketOptions(
  bucketMeta?: InputLengthBucketMeta[] | null,
  includeAll = false,
  allLabel = "\u5168\u90e8\u6587\u672c"
): Array<{ value: string; label: string }> {
  const options = getInputLengthBucketMeta(bucketMeta).map((item) => ({
    value: item.key,
    label: item.label
  }));
  return includeAll ? [{ value: "", label: allLabel }, ...options] : options;
}
