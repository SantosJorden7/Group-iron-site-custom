import { BaseElement } from "../base-element/base-element";

class StatBar extends BaseElement {
  constructor() {
    super();
    this.ratio = 1.0;
    this.color = "#00ff00"; // Default green
    this.bgColor = "#003300"; // Default darker green background
  }

  html() {
    return /*html*/`
      <div class="stat-bar">
        <div class="stat-bar__fill"></div>
      </div>
    `;
  }

  connectedCallback() {
    super.connectedCallback();
    this.render();
    
    // Get fill element
    this.fill = this.querySelector(".stat-bar__fill");
    
    // Get attributes
    this.color = this.getAttribute("bar-color") || this.color;
    this.bgColor = this.getAttribute("bar-bgcolor") || this.bgColor;

    if (!this.bgColor && this.color.startsWith("#")) {
      const darkened = this.darkenColor(this.hexToRgb(this.color));
      this.bgColor = `rgb(${darkened.r}, ${darkened.g}, ${darkened.b})`;
    }

    if (this.color.startsWith("hsl")) {
      const [hue, saturation, lightness] = this.color.match(/\d+/g).map(Number);
      this.color = { hue, saturation, lightness };
    }

    // Initialize with default ratio or from attribute
    const ratio = parseFloat(this.getAttribute("bar-ratio"), 10);
    if (!isNaN(ratio)) {
      this.update(ratio);
    } else {
      this.update(1.0);
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
  }

  hexToRgb(hex) {
    // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
    var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, function (m, r, g, b) {
      return r + r + g + g + b + b;
    });

    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null;
  }

  darkenColor(color) {
    const d = 3.0;
    return {
      r: Math.round(color.r / d),
      g: Math.round(color.g / d),
      b: Math.round(color.b / d),
    };
  }

  getColor(ratio) {
    if (typeof this.color === "string") return this.color;

    const color = { ...this.color };
    color.hue = color.hue * ratio;
    return `hsl(${Math.round(color.hue)}, ${color.saturation}%, ${color.lightness}%)`;
  }

  update(ratio) {
    if (!this.isConnected) return;
    
    // Store the ratio
    this.ratio = ratio;
    
    // Update the fill element width
    if (this.fill) {
      this.fill.style.width = `${ratio * 100}%`;
      this.fill.style.backgroundColor = this.getColor(ratio);
    } else {
      // Fallback to the linear gradient approach if fill element is not available
      const x = ratio * 100;
      const color = this.getColor(ratio);
      
      if (ratio === 1) {
        this.style.background = color;
      } else {
        this.style.background = `linear-gradient(90deg, ${color}, ${x}%, ${this.bgColor} ${x}%)`;
      }
    }
  }
}

// Define the custom element
customElements.define("stat-bar", StatBar);

// Add a direct extension for <div class="stat-bar"> elements
document.addEventListener("DOMContentLoaded", () => {
  // Find all elements with class "stat-bar" that are not the custom element
  const statBars = document.querySelectorAll('div.stat-bar:not(stat-bar)');
  
  statBars.forEach(bar => {
    // Create update method for each div.stat-bar
    const fill = bar.querySelector('.stat-bar__fill');
    if (fill) {
      bar.update = (ratio) => {
        fill.style.width = `${ratio * 100}%`;
      };
    }
  });
});
