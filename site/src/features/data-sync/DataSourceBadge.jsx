import React from 'react';
import { Badge, OverlayTrigger, Tooltip } from 'react-bootstrap';
import './multi-source.css';

/**
 * DataSourceBadge - Reusable component for displaying data source badges
 * Used consistently across all feature panels
 * 
 * @param {Object} badge - Badge configuration with text, variant, and title
 * @returns {React.Component} - Badge component with tooltip
 */
const DataSourceBadge = ({ badge }) => {
  if (!badge) return null;
  
  return (
    <OverlayTrigger
      placement="top"
      overlay={
        <Tooltip id={`tooltip-${badge.text}`}>
          {badge.title}
        </Tooltip>
      }
    >
      <Badge 
        variant={badge.variant} 
        className="data-source-badge"
      >
        {badge.text}
      </Badge>
    </OverlayTrigger>
  );
};

export default DataSourceBadge;
