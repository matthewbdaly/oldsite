---
title: "Using Jenkins pipelines"
date: 2016-06-05 16:32:15 +0100
categories:
- jenkins
comments: true
---

I use Jenkins as my main continuous integration solution at work, largely for two reasons:

* It generally works out cheaper to host it ourselves than to use one of the paid CI solutions for closed-source projects
* The size of the plugin ecosystem

However, we also use Travis CI for testing one or two open-source projects, and one distinct advantage Travis has is the way you can configure it using a single text file.

With the Pipeline plugin, it's possible to define the steps required to run your tests in a `Jenkinsfile` and then set up a Pipeline job which reads that file from the version control system and runs it accordingly. Here's a sample `Jenkinsfile` for a Laravel project:

```groovy
node {
   // Mark the code checkout 'stage'....
   stage 'Checkout'

   // Get some code from a Bitbucket repository
   git credentialsId: '5239c33e-10ab-4c1b-a4a0-91b96a07955e', url: 'git@bitbucket.org:matthewbdaly/my-app.git'
   
   // Install dependencies
   stage 'Install dependencies'
   
   // Run Composer
   sh 'composer install'

   // Test stage
   stage 'Test'
   
   // Run the tests
   sh "vendor/bin/phpunit"
}
```

Note the steps it's broken down into:

* `stage` defines the start of a new stage in the build
* `git` defines a point where we check out the code from the repository
* `sh` defines a point where we run a shell command

Using these three commands it's straightforward to define a fairly simple build process for your application in a way that's more easily repeatable when creating new projects - for instance, you can copy this over to a new project and change the source repository URL and you're pretty much ready to go.

Unfortunately, support for the Pipeline plugin is missing from a lot of Jenkins plugins - for instance, I can't publish the XML coverage reports. This is something of a deal-breaker for most of my projects as I use these kind of report plugins a lot - it's one of the reasons I chose Jenkins over Travis. Still, this is definitely a big step forward, and if you don't need this kind of reporting then there's no reason not to consider using the Pipeline plugin for your Jenkins jobs. Hopefully in future more plugins will be amended to work with Pipeline so that it's more widely usable.
