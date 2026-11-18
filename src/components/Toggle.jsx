import { forwardRef, useId } from "react";

/**
 * Toggle – a styled replacement for <input type="checkbox" />.
 *
 * It renders a real, visually-hidden checkbox, so everything that works with a
 * checkbox keeps working: `checked` / `defaultChecked`, `onChange`, `name`,
 * `value`, `disabled`, `required`, form submission, react-hook-form's
 * `register()`, Formik's `<Field>`, keyboard (Space) and screen readers.
 *
 * Usage
 *   <Toggle checked={on} onChange={(e) => setOn(e.target.checked)} />
 *   <Toggle label="Email notifications" defaultChecked />
 *   <Toggle {...register("newsletter")} label="Newsletter" />
 *   <Toggle size="sm" label="Compact" labelPosition="left" />
 *
 * Requires Tailwind CSS (v3 or v4). No extra plugins.
 */

const SIZES = {
  sm: { track: "h-5 w-9", knob: "h-4 w-4", shift: "peer-checked:[&>span]:translate-x-4" },
  md: { track: "h-6 w-11", knob: "h-5 w-5", shift: "peer-checked:[&>span]:translate-x-5" },
  lg: { track: "h-8 w-14", knob: "h-7 w-7", shift: "peer-checked:[&>span]:translate-x-6" },
};

const Toggle = forwardRef(function Toggle(
  {
    label,
    description,
    labelPosition = "right", // "left" | "right"
    size = "md", // "sm" | "md" | "lg"
    className = "",
    id,
    disabled,
    ...inputProps // checked, onChange, name, value, required, register() props…
  },
  ref
) {
  const autoId = useId();
  const inputId = id || autoId;
  const s = SIZES[size] || SIZES.md;

  const text = (label || description) && (
    <span className="flex flex-col select-none">
      {label && <span className="text-sm font-medium text-gray-900">{label}</span>}
      {description && <span className="text-xs text-gray-500">{description}</span>}
    </span>
  );

  return (
    <label
      htmlFor={inputId}
      className={[
        "inline-flex items-center gap-3",
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
        className,
      ].join(" ")}
    >
      {labelPosition === "left" && text}

      {/* Real checkbox – hidden visually, still focusable */}
      <input
        ref={ref}
        id={inputId}
        type="checkbox"
        role="switch"
        disabled={disabled}
        className="peer sr-only"
        {...inputProps}
      />

      {/* Track */}
      <span
        aria-hidden="true"
        className={[
          "relative inline-flex shrink-0 items-center rounded-full p-0.5",
          "bg-gray-200 transition-colors duration-200 ease-out",
          "peer-checked:bg-neutral-900",
          "peer-focus-visible:ring-2 peer-focus-visible:ring-neutral-900",
          "peer-focus-visible:ring-offset-2",
          s.track,
          s.shift,
        ].join(" ")}
      >
        {/* Knob */}
        <span
          className={[
            "block rounded-full bg-white shadow-sm ring-1 ring-black/5",
            "transition-transform duration-200 ease-out",
            s.knob,
          ].join(" ")}
        />
      </span>

      {labelPosition === "right" && text}
    </label>
  );
});

export default Toggle;

/* ------------------------------------------------------------------ */
/* Example                                                             */
/* ------------------------------------------------------------------ */
// import { useState } from "react";
// import Toggle from "./Toggle";
//
// export function Demo() {
//   const [dark, setDark] = useState(true);
//   return (
//     <div className="space-y-4 p-6">
//       <Toggle checked={dark} onChange={(e) => setDark(e.target.checked)} label="Dark mode" />
//       <Toggle label="Email alerts" description="Get a summary every Monday" />
//       <Toggle size="sm" disabled label="Disabled" />
//     </div>
//   );
// }