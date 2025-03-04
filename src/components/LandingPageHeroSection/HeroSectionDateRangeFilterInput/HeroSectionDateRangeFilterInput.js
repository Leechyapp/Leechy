import { injectIntl } from 'react-intl';
import DateRangeInput from '../../FieldDateRangeInput/DateRangeInput';
import css from './HeroSectionDateRangeFilterInput.module.scss';
import isNativePlatform from '../../../util/isNativePlatform';

const HeroSectionDateRangeFilterInput = injectIntl(props => {
  const { intl, onChangeDate, inputDate, iosCushion } = props;

  const startDateLabel = intl.formatMessage({
    id: 'HeroSectionDateRangeFilterInput.startDateLabel',
  });
  const endDateLabel = intl.formatMessage({
    id: 'HeroSectionDateRangeFilterInput.endDateLabel',
  });

  const label =
    startDateLabel && endDateLabel ? (
      <div className={css.rowUnsetMarginLR}>
        <div className={css.col6}>
          <label>{startDateLabel}</label>
        </div>
        <div className={css.col6}>
          <label>{endDateLabel}</label>
        </div>
      </div>
    ) : null;

  return (
    <div className={css.dateModalContents}>
      {isNativePlatform && iosCushion}
      {label}
      <DateRangeInput
        onChange={onChangeDate}
        onBlur={() => {}}
        onFocus={() => {}}
        isOutsideRange={() => {}}
        value={inputDate}
      />
    </div>
  );
});

export default HeroSectionDateRangeFilterInput;
