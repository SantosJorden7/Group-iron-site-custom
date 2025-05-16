import React from 'react';
import ReactDOMServer from 'react-dom/server';
import ReactDOM from 'react-dom';
import { ReactProviders } from '../contexts/ReactProviders';

/**
 * Utility function that converts a React component to an HTML string
 * for use in custom elements
 * 
 * @param {React.ComponentType} Component - The React component to render
 * @param {Object} props - Props to pass to the component
 * @returns {string} HTML string representation of the component
 */
export function reactToHtml(Component, props = {}) {
  return ReactDOMServer.renderToString(
    <ReactProviders>
      <Component {...props} />
    </ReactProviders>
  );
}

/**
 * Hydrates a React component into a specified container
 * 
 * @param {React.ComponentType} Component - The React component to render
 * @param {HTMLElement} container - DOM element to render the component in
 * @param {Object} props - Props to pass to the component
 */
export function hydrateReact(Component, container, props = {}) {
  ReactDOM.hydrate(
    <ReactProviders>
      <Component {...props} />
    </ReactProviders>,
    container
  );
}
