import { z } from "zod";

export const EmailSchema = z
  .email()
  .toLowerCase()
  .trim()
  .max(255, "Email must be less than 256 characters");

export const PhoneSchema = z
  .string()
  .trim()
  .max(32, "Phone must be less than 33 characters");

export const UrlSchema = z
  .httpUrl()
  .trim()
  .max(2048, "URL must be less than 2049 characters");

export const ShortTextSchema = z
  .string()
  .trim()
  .max(255, "Must be less than 256 characters");

export const LongTextSchema = z
  .string()
  .trim()
  .max(5000, "Must be less than 5001 characters");
