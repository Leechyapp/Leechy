import { Tooltip as ReactTooltip } from 'react-tooltip';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import css from './ToolTip.module.scss';

const ToolTip = props => {
  const { content } = props;
  return (
    <>
      <span className={css.toolTip}>
        <FontAwesomeIcon data-tooltip-id="info-tooltip" icon={'fa-solid fa-circle-question'} />
      </span>
      <ReactTooltip id="info-tooltip" place="bottom" content={content} />
    </>
  );
};

export default ToolTip;
