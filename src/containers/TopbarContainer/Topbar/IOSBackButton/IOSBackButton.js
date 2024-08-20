import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React from 'react';
import css from './IOSBackButton.module.scss';

const IOSBackButton = () => {
  return <FontAwesomeIcon className={css.iosBackButton} icon="fa-solid fa-chevron-left" />;
};

export default IOSBackButton;
