import { Tooltip as ReactTooltip } from 'react-tooltip';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import css from './ToolTip.module.scss';

const ToolTip = props => {
  const { content, style } = props;
  return (
    <>
      <span className={css.toolTip} style={style}>
        <FontAwesomeIcon data-tooltip-id="info-tooltip" icon={'fa-solid fa-circle-question'} />
      </span>
      <ReactTooltip
        id="info-tooltip"
        place="bottom"
        content={<div className={css.tooltipContentContainer}>{content}</div>}
      />
    </>
  );
};

export default ToolTip;
