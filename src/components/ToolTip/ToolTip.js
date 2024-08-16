import React from 'react';
import { Tooltip as ReactTooltip } from 'react-tooltip';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import css from './ToolTip.module.scss';

const ToolTip = props => {
  const { id, content, style } = props;

  const toopTipId = `${id}-info-tooltip`;

  return (
    <>
      <span className={css.toolTip} style={style}>
        <FontAwesomeIcon data-tooltip-id={toopTipId} icon={'fa-solid fa-circle-question'} />
      </span>
      <ReactTooltip
        id={toopTipId}
        place="bottom"
        content={<div className={css.tooltipContentContainer}>{content}</div>}
      />
    </>
  );
};

export default ToolTip;
