import React from 'react';
import Badge from 'react-bootstrap/Badge';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Tooltip from 'react-bootstrap/Tooltip';

/**
 * Badge component for Collection Log items showing the data source
 * Displays P (Plugin), W (Wise Old Man), or K (Wiki) with tooltips
 */
const CollectionLogBadge = ({ source }) => {
  if (!source || !source.badge) return null;
  
  const { text, variant, title } = source.badge;
  const timestamp = source.timestamp ? new Date(source.timestamp).toLocaleString() : '';
  const tooltipText = timestamp ? `${title} - Updated: ${timestamp}` : title;
  
  return (
    <OverlayTrigger
      placement="top"
      overlay={<Tooltip className="collection-log-tooltip">{tooltipText}</Tooltip>}
    >
      <Badge 
        className="collection-log-badge" 
        bg={variant}
        style={{ 
          fontSize: '9px', 
          position: 'absolute', 
          top: '2px', 
          right: '2px', 
          padding: '2px 4px',
          fontFamily: 'rssmall',
          textShadow: '1.3px 1.3px var(--black)',
          zIndex: 10
        }}
      >
        {text}
      </Badge>
    </OverlayTrigger>
  );
};

export default CollectionLogBadge;
