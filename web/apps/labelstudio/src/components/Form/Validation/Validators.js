import { isDefined, isEmptyString } from "../../../utils/helpers";
import "./Validation.scss";

export const required = (_fieldName, value) => {
  if (!isDefined(value) || isEmptyString(value)) {
    return "This field is required";
  }
};

export const minLength = (min) => (_fieldName, value) => {
  if (isDefined(value) && !isEmptyString(value) && String(value).length < min) {
    return `Must have at least ${min} characters`;
  }
};

export const maxLength = (max) => (_fieldName, value) => {
  if (isDefined(value) && String(value).length > max) {
    return `Must not be longer than ${max} characters`;
  }
};

export const matchPattern = (pattern) => (_fieldName, value) => {
  pattern = typeof pattern === "string" ? new RegExp(pattern) : pattern;

  if (!isEmptyString(value) && value.match(pattern) === null) {
    return `Must match the pattern ${pattern}`;
  }
};

export const json = (_fieldName, value) => {
  const err = "Must be a valid JSON string";

  if (!isDefined(value) || value.trim().length === 0) return;

  if (/^(\{|\[)/.test(value) === false || /(\}|\])$/.test(value) === false) {
    return err;
  }

  try {
    JSON.parse(value);
  } catch (_e) {
    return err;
  }
};

export const regexp = (_fieldName, value) => {
  try {
    new RegExp(value);
  } catch (_err) {
    return "Must be a valid regular expression";
  }
};

export const url = (_fieldName, value) => {
  if (!isDefined(value) || isEmptyString(value)) return;

  try {
    new URL(value);
  } catch (_err) {
    return "Must be a valid URL";
  }
};
