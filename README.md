# Sharetribe Web Template

[![CircleCI](https://circleci.com/gh/sharetribe/web-template.svg?style=svg)](https://circleci.com/gh/sharetribe/web-template)

This is a template web application for Sharetribe marketplaces. You could create your own unique
marketplace web app by cloning this repository and then extending and customizing it to your needs.
This template is bootstrapped with
[create-react-app](https://github.com/facebookincubator/create-react-app) with some additions,
namely server side rendering, code-splitting, and a custom CSS setup.

> **Note**: You should start your customization project on top of this one instead of the old
> templates:
>
> - [FTW-daily](https://github.com/sharetribe/ftw-daily)
> - [FTW-hourly](https://github.com/sharetribe/ftw-hourly)
> - [FTW-product](https://github.com/sharetribe/ftw-hourly)
>
> Read more from
> [Sharetribe Developer Docs](https://www.sharetribe.com/docs/template/sharetribe-web-template/)

## Quick start

### Setup localhost

If you just want to get the app running quickly to test it out, first install
[Node.js](https://nodejs.org/) and [Yarn](https://yarnpkg.com/), and follow along:

```sh
git clone git@github.com:sharetribe/web-template.git  # clone this repository
cd web-template/                                      # change to the cloned directory
yarn install                                          # install dependencies
yarn run config                                       # add the mandatory env vars to your local config
yarn run dev                                          # start the dev server, this will open a browser in localhost:3000
```

You can also follow along the
[Getting started with Sharetribe Web Template](https://www.sharetribe.com/docs/introduction/getting-started-with-web-template/)
tutorial in the [Sharetribe Developer Docs](https://www.sharetribe.com/docs/).

For more information of the configuration, see the
[Environment configuration variables](https://www.sharetribe.com/docs/template/template-env/)
reference in Sharetribe Developer Docs.

### For Windows users

We strongly recommend installing
[Windows Subsystem for Linux](https://docs.microsoft.com/en-us/windows/wsl/about), if you are
developing on Windows. These templates are made for Unix-like web services which is the most common
environment type on host-services for web apps. Also, the Developer Docs use Unix-like commands in
articles instead of DOS commands.

## Getting started with your own customization

If you want to build your own Sharetribe marketplace by customizing the template application, see
the
[How to Customize the Template](https://www.sharetribe.com/docs/template/how-to-customize-template/)
guide in Developer Docs.

## Deploying to Heroku

**Note:** Remember to fork the repository before deploying the application. Connecting your own
Github repository to Heroku will make manual deploys easier.

See the
[How to deploy this template to production](https://www.sharetribe.com/docs/template/how-to-deploy-template-to-production/)
guide in Developer Docs for more information.

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)

### Heroku (Manual Deployment)

If you have auto-deployment enabled on your Heroku server, then simplying committing your latest
code via Github should trigger a deployment. Below are the instructions for manual deployments to
your Heroku server.

```
# Firstly, ensure that heroku cli is installed on your machine
npm install -g heroku
heroku -v

# Check if heroku is pointed to desired server
git remote -v

# Switch remote (e.g. switch between staging/production server)
heroku git:remote -a yourapp-staging
-- or ---
heroku git:remote -a yourapp-prod

# Deploy web app to heroku (you should deploy from your ideal branch)
git push heroku staging:main
-- or --
git push heroku main

```

trigger deploy

## Documentation

See the Sharetribe Developer Docs: [sharetribe.com/docs/](https://www.sharetribe.com/docs/)

## Get help – join Sharetribe Developer Slack channel

If you have any questions about development, the best place to ask them is the Developer Slack
channel at https://www.sharetribe.com/dev-slack

If you need help with development, you can hire a verified software developer with Sharetribe
experience from the [Expert Network](https://www.sharetribe.com/experts/).

## License

This project is licensed under the terms of the Apache-2.0 license.

See [LICENSE](LICENSE)

## Cacapitor

## Android

#### Sync and run in Android Studio

```
npx cap sync android
npx cap open android
```

Once the android folder has been synced "npx cap sync android" and Android has been opened, push the
play button on Android Studio (which should download the .apk and launch the app in your device)

#### Errors:
If you run any errors such as:
```
✖ copy android - failed!
[error] Error: EACCES: permission denied, open '/home/[username]/Documents/GitHub/[YourRepo]/android/app/src/main/assets/capacitor.config.json'
```
then manually create an "assets" golder in "android/app/src/main" and grant access to the folder:
```
cd android/app/src/main
sudo mkdir assets
sudo chmod -R 777 assets
```

#### Port forwarding

Navigate to chrome://inspect/#devices

- Click "Port forwarding..."
- Set front-end port 3020 and localhost:3020
- Set back-end port 3520 and localhost:3520

#### Unable to connect (port forwarding)

If you're unable to connect via port forwarding, try the following

```
cd into "C:\Users\[username]\AppData\Local\Android\sdk\platform-tools"

adb kill-server
adb start-server
adb reverse tcp:8081  tcp:8081

On Windows, add "./" in from of adb, so "./adb".

Live reload documentation
```
npm install -g @ionic/cli native-run
```
https://capacitorjs.com/docs/guides/live-reload
https://ionicframework.com/docs/cli/commands/capacitor-run

```

#### Changing Asset Images (Icons)

Documentation: https://developer.android.com/studio/write/create-app-icons#access

Run Image Asset Studio To start Image Asset Studio, follow these steps:

1. In the Project window, select the Android view.
2. Right-click the res folder and select New > Image Asset.

#### Generating Assets with @capacitor/assets

Documentation: https://capacitorjs.com/docs/guides/splash-screens-and-icons

```
npm install @capacitor/assets --save-dev
-- or --
yarn add @capacitor/assets -D
```

Provide icon and splash screen source images using this folder/filename structure:

```
assets/
├── icon-only.png
├── icon-foreground.png
├── icon-background.png
├── splash.png
└── splash-dark.png
```

- Icon files should be at least 1024px x 1024px.
- Splash screen files should be at least 2732px x 2732px.
- The format can be jpg or png.

```
npx capacitor-assets generate
-- or --
npx capacitor-assets generate --android
npx capacitor-assets generate --ios
```

## IOS

Enviornment

- Xcode version 15+
- IOS 17+

```
npx cap sync ios
npx cap open ios
```

### Distrubution

#### Step 1:

Select generic device "Any IOS Device (arm64)"

#### Step 2:

Create an Archive Product > Archive

Errors on Archive If you get an error called

```
Command PhaseScriptExecution failed with a nonzero exit code
```

Then go to: ios/App/Pods/Target Support Files/Pods-App/Pods-App-frameworks.sh

and replace the following

```
source="$(readlink "${source}")"
```

with

```
source="$(readlink -f "${source}")"
```

#### Step 3:

Distribute to TestFlight & App Store from the list of Archive(s)

## Firebase Push Notifications

### Android apps
1. Go to https://console.firebase.google.com
2. Select the applicable app project.
3. Inside the project, click the Settings gear => Project settings
4. Add app
5. Select Android
6. After creating the Android app, it should give you a <strong>google-account.json</strong> file.
7. Follow Google's instructions on where in the project folder to paste (e.g. android/app folder).

### Web apps: Node.js Firebase Admin

Create the Google Services file in Firebase Console, and paste the <strong>service-account.json</strong> file you get from Google inside of server/api/module folder:
```
└── modules
    ├── firebase-admin.js
    └── service-account-development.json
    └── service-account-production.json
```

#### SHA1 / SHA256 fingerprint
Instructions to retrieve the SHA1 / SHA256 fingerprint.

Navigate to the keystore folder:
```
cd keystore
```

To get the <strong>Debug</strong> certificate fingerprint (SHA1 / SHA256):
```
keytool -list -v -alias appname_debug_android_keystore -keystore ./appname_debug_android.keystore
```
---

## Merge upstream repo

```
git remote -v
git fetch upstream
git merge upstream/main

```

## DB Migrations with Knex

```
# Firstly, please ensure knex is installed globally
npm i -g knex

# Database creation
Create database in MySQL called "YourDatabaseName"

# Once DB is created, run db migrations:
yarn run migrate

# To create a new migration file, run:
yarn run make:migration create_table_example

# Rollbacks
# ***PLEASE BE CAREFUL DOING ROLLBACKS ON PRODUCTION***
# To rollback the latest db migrations, run:
yarn run dev-rollback
```
