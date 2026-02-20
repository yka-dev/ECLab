import React, { useRef } from "react";

interface Props {
  hint: string;
  isSelected?: boolean;
  icon: React.ReactNode;
  onClick: () => void;
}

const QuickActionButton: React.FC<Props> = ({ 
    isSelected = false,
    icon,
    onClick, 
    hint,
  }) => { 

    const ref = useRef<HTMLButtonElement>(null);

  return (
    <button 
      className="quick-action-button"
      ref={ref}
      style={{
        backgroundColor: isSelected ? "#535bf2" : "transparent",
        color: isSelected ? "white" : "black",}}
      onClick={onClick}
      onMouseEnter={(e) => {
        const tooltip = document.createElement("div");
        tooltip.className = "tooltip"
        tooltip.style.position = "absolute";


        const rect = ref.current?.getBoundingClientRect();

        tooltip.style.left = `${rect?.x}px`;        
        tooltip.style.top = `${rect?.y! - rect?.height!}px`;

        tooltip.innerText = hint;
        document.body.appendChild(tooltip);
        ;}}
      onMouseLeave={() => {
        const tooltip = document.querySelector(".tooltip");
        if (tooltip) {
          document.body.removeChild(tooltip);
        }
      }}
    >
    {icon}
    </button>
  );
}

export default QuickActionButton;