import React from 'react';
import { FormattedMessage, injectIntl, intlShape } from '../../util/reactIntl';
import css from './StripeExpressPayoutPage.module.scss';
import { H3, LayoutSideNavigation, Page, UserNav } from '../../components';
import StripeExpressStatusBox from '../../components/StripeExpressStatusBox/StripeExpressStatusBox';
import TopbarContainer from '../TopbarContainer/TopbarContainer';
import FooterContainer from '../../containers/FooterContainer/FooterContainer';

export const StripeExpressPayoutPage = injectIntl(props => {
  const { title, scrollingDisabled } = props;

  return (
    <Page title={title} scrollingDisabled={scrollingDisabled}>
      <LayoutSideNavigation
        topbar={
          <>
            <TopbarContainer
              desktopClassName={css.desktopTopbar}
              mobileClassName={css.mobileTopbar}
            />
            <UserNav currentPage="StripeExpressPayoutPage" />
          </>
        }
        sideNav={null}
        useAccountSettingsNav
        currentPage="StripeExpressPayoutPage"
        footer={<FooterContainer />}
      >
        <div className={css.content}>
          <H3 as="h1" className={css.heading}>
            <FormattedMessage id="StripePayoutPage.heading" />
          </H3>
          <div className={css.rowUnsetMarginLR}>
            <div className={css.col12}>
              <StripeExpressStatusBox />
            </div>
          </div>
        </div>
      </LayoutSideNavigation>
    </Page>
  );
});

StripeExpressPayoutPage.defaultProps = {};

StripeExpressPayoutPage.propTypes = {
  intl: intlShape.isRequired,
};

export default StripeExpressPayoutPage;
