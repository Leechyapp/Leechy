import React from 'react';
import { FormattedMessage, intlShape } from '../../util/reactIntl';
import { formatMoney } from '../../util/currency';
import { LINE_ITEM_INSURANCE, propTypes } from '../../util/types';

import css from './OrderBreakdown.module.css';
import ToolTip from '../ToolTip/ToolTip';

const LineItemInsuranceMaybe = props => {
  const { lineItems, intl } = props;

  const insuranceLineItem = lineItems.find(
    item => item.code === LINE_ITEM_INSURANCE && !item.reversal
  );

  return insuranceLineItem ? (
    <div className={css.lineItem}>
      <span className={css.itemLabel}>
        <FormattedMessage id="OrderBreakdown.insurance" />
        <ToolTip
          id="insurance"
          content={<FormattedMessage id="LineItemInsuranceMaybe.insuranceFeeNote" />}
        />
      </span>
      <span className={css.itemValue}>{formatMoney(intl, insuranceLineItem.lineTotal)}</span>
    </div>
  ) : null;
};

LineItemInsuranceMaybe.propTypes = {
  lineItems: propTypes.lineItems.isRequired,
  intl: intlShape.isRequired,
};

export default LineItemInsuranceMaybe;
