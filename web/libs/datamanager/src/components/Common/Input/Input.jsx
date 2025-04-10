import React from "react";
import { cn } from "../../../utils/bem";
import "./Input.scss";

const Input = React.forwardRef(({ className, size, rawClassName, ...props }, ref) => {
  const classList = [cn("input-dm").mod({ size }).mix(className), rawClassName].filter(Boolean).join(" ");

  return <input {...props} className={classList} ref={ref} />;
});

export default Input;
