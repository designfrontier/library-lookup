#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { LibraryLookupStack } from '../lib/library-lookup-stack';

const app = new cdk.App();
new LibraryLookupStack(app, 'LibraryLookupStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});
