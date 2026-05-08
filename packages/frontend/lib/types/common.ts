// 通用类型定义

export type InputLengthBucketKey = "short" | "medium" | "long";

export type InputLengthBucketMeta = {
  key: InputLengthBucketKey;
  label: string;
  min_tokens: number | null;
  max_tokens: number | null;
  description: string;
};

export type FilterOptions = {
  providers: string[];
  input_length_buckets: InputLengthBucketKey[];
  input_length_bucket_meta: InputLengthBucketMeta[];
  models: string[];
};

// 统一的贡献者等级系统
export type ContributionLevel =
  | "observer"
  | "beginner"
  | "intermediate"
  | "advanced"
  | "expert"
  | "legend";

// 速度评级
export type SpeedRating = { label: string; color: string };
