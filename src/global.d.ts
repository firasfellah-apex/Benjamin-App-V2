// global types

// Lordicon custom element type declaration
import React from 'react';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'lord-icon': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          src?: string;
          trigger?: string;
          state?: string;
          colors?: string;
          stroke?: string;
          style?: React.CSSProperties;
        },
        HTMLElement
      >;
    }
  }
}
