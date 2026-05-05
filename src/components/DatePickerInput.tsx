import { useRef } from "react";

interface Props {
  value: string;
  min?: string;
  label?: string;
  dark?: boolean;
  onChange: (value: string) => void;
}

export function DatePickerInput({ value, min, label = "Fecha", dark = false, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  function openPicker() {
    const input = inputRef.current;
    if (!input) return;
    input.focus();
    if ("showPicker" in input) {
      try {
        input.showPicker();
      } catch {
        // Some browsers only allow showPicker from direct user gestures.
      }
    }
  }

  return (
    <button
      type="button"
      onClick={openPicker}
      className={`w-full text-left rounded-xl border px-4 py-3 transition-all ${
        dark
          ? "bg-white/[0.07] border-white/10 hover:border-white/30 focus-within:border-white/35"
          : "bg-white border-gray-200 hover:border-primary/50 focus-within:ring-2 focus-within:ring-primary/40"
      }`}
    >
      <span className={`block text-[11px] font-semibold uppercase tracking-wider mb-1 ${dark ? "text-white/35" : "text-gray-500"}`}>
        {label}
      </span>
      <div className="flex items-center gap-3">
        <input
          ref={inputRef}
          type="date"
          min={min}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onClick={(e) => {
            e.stopPropagation();
            openPicker();
          }}
          className={`min-w-0 flex-1 bg-transparent text-sm outline-none appearance-none cursor-pointer ${
            dark ? "text-white [color-scheme:dark]" : "text-gray-900"
          }`}
        />
        <span className={`shrink-0 text-lg leading-none ${dark ? "text-white/35" : "text-gray-400"}`}>⌄</span>
      </div>
    </button>
  );
}
