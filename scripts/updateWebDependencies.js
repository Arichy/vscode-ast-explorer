const axios = require('axios').default;
const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');

const webPackageJsonPath = path.resolve(__dirname, '../web/package.json');
const webPath = path.resolve(__dirname, '../web');

axios
  .get(
    'https://raw.githubusercontent.com/fkling/astexplorer/master/website/package.json'
  )
  .then((res) => {
    if (res.data?.dependencies) {
      const localPackageJson = require(webPackageJsonPath);

      const remoteDependencies = res.data.dependencies;
      const localDependencies = localPackageJson.dependencies;
      for (const [package, semver] of Object.entries(localDependencies)) {
        const remoteSemVer = remoteDependencies[package];
        if (remoteSemVer && remoteSemVer !== semver) {
          localDependencies[package] = remoteSemVer;
        }
      }

      const remoteDevDependencies = res.data.devDependencies;
      const localDevDependencies = localPackageJson.devDependencies;
      for (const [package, semver] of Object.entries(remoteDevDependencies)) {
        localDevDependencies[package] = semver;
      }

      fs.writeFileSync(
        webPackageJsonPath,
        JSON.stringify(localPackageJson, null, 2)
      );

      childProcess.spawn('yarn', ['install'], {
        cwd: webPath,
        stdio: 'inherit',
      });
    }
  });
