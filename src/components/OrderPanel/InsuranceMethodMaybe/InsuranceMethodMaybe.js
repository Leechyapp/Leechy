import React from 'react';
import FieldSelect from '../../FieldSelect/FieldSelect';
import FieldTextInput from '../../FieldTextInput/FieldTextInput';
import css from './InsuranceMethodMaybe.module.scss';
import { required } from '../../../util/validators';
import { InsuranceMethodEnum } from '../../../enums/insurance-method.enum';

const InsuranceMethodMaybe = props => {
  const { insuranceMethod, hasSecurityDeposit, formId, intl } = props;
  return hasSecurityDeposit ? (
    <FieldSelect
      id={`${formId}.insuranceMethod`}
      className={css.insuranceMethodField}
      name="insuranceMethod"
      label={intl.formatMessage({ id: 'InsuranceMethodMaybe.insuranceMethod.label' })}
      validate={required(
        intl.formatMessage({ id: 'InsuranceMethodMaybe.insuranceMethod.required' })
      )}
      value={insuranceMethod}
    >
      <option disabled value="">
        {intl.formatMessage({ id: 'InsuranceMethodMaybe.insuranceMethod.placeholder' })}
      </option>
      <option value={InsuranceMethodEnum.Insurance}>
        {intl.formatMessage({ id: 'InsuranceMethodMaybe.insuranceMethod.insurance.option' })}
      </option>
      <option value={InsuranceMethodEnum.SecurityDeposit}>
        {intl.formatMessage({ id: 'InsuranceMethodMaybe.insuranceMethod.securityDeposit.option' })}
      </option>
    </FieldSelect>
  ) : (
    <FieldTextInput
      id={`${formId}.insuranceMethod`}
      className={css.insuranceMethodField}
      name="insuranceMethod"
      type="hidden"
    />
  );
};

export default InsuranceMethodMaybe;
