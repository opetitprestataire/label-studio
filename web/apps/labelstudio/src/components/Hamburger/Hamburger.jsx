import { cn } from "../../utils/bem";
import "./Hamburger.scss";

export const Hamburger = ({ opened, animated = true, className }) => {
  const root = cn("hamburger");

  return (
    <span className={cn(root.mod({ animated, opened }), className)}>
      <span />
      <span />
      <span />
    </span>
  );
};
