---
title: "Building a letter classifier in PHP with Tesseract OCR and PHP ML"
date: 2018-05-10 22:50:08 +0000
categories:
- php
- machine-learning
comments: true
---

PHP isn't the first language that springs to mind when it comes to machine learning. However, it is practical to use PHP for machine learning purposes. In this tutorial I'll show you how to build a pipeline for classifying letters.

The brief
---------

Before I was a web dev, I was a clerical worker for an FTSE-100 insurance company, doing a lot of work that nowadays is possible to automate away, if you know how. When they received a letter or other communication from a client, it would be sent to be scanned on. Once scanned, a human would have to look at it to classify it, eg was it a complaint, a request for information, a request for a quote, or something else, as well as assign it to a policy number. Let's imagine we've been asked to build a proof of concept for automating this process. This is a good example of a real-world problem that machine learning can help with.

As this is a proof of concept we aren't looking to build a web app for this - for simplicity's sake this will be a command-line application. Unlike emails, letters don't come in an easily machine-readable format, so we will be receiving them as PDF files (since they would have been scanned on, this is a reasonable assumption). Feel free to mock up your own example letters using your own classifications, but I will be classifying letters into four groups:

* **Complaints** - letters expressing dissatisfaction
* **Information requests** - letters requesting general information
* **Surrender quotes** - letters requesting a surrender quote
* **Surrender forms** - letters requesting surrender forms

Our application will therefore take in a PDF file at one end, and perform the following actions on it:

* Convert the PDF file to a PNG file
* Use OCR (optical character recognition) to convert the letter to plain text
* Strip out unwanted whitespace
* Extract any visible policy number from the text
* Use a machine learning library to classify the letter, having taught it using prior examples

Sound interesting? Let's get started...

Introducing pipelines
---------------------

As our application will be carrying out a series of discrete steps on our data, it makes sense to use the pipeline pattern for this project. Fortunately, the PHP League have produced a excellent [package](http://pipeline.thephpleague.com/) implementing this. We can therefore create a single class for each step in the process and have it handle that in isolation.

We'll also use the Symfony Console component to implement our command-line application. For our machine learning library we will be using [PHP ML](https://php-ml.readthedocs.io/en/latest/), which requires PHP 7.1 or greater. For OCR, we will be using [Tesseract](https://github.com/thiagoalessio/tesseract-ocr-for-php), so you will need to install the underlying Tesseract OCR library, as well as support for your language. On Ubuntu you can install these as follows:

```bash
$ sudo apt-get install tesseract-ocr tesseract-ocr-eng
```

This assumes you are using English, however you should be able to find packages to support many other languages. Finally, we need ImageMagick to be installed in order to convert PDF files to PNG's.

Your `composer.json` should look something like this:

```json
{
    "name": "matthewbdaly/letter-classifier",
    "description": "Demo of classifying letters in PHP",
    "type": "project",
    "require": {
        "league/pipeline": "^0.3.0",
        "thiagoalessio/tesseract_ocr": "^2.2",
        "php-ai/php-ml": "^0.6.2",
        "symfony/console": "^4.0"
    },
    "require-dev": {
        "phpspec/phpspec": "^4.3",
        "psy/psysh": "^0.8.17"
    },
    "autoload": {
        "psr-4": {
            "Matthewbdaly\\LetterClassifier\\": "src/"
        }
    },
    "license": "MIT",
    "authors": [
        {
            "name": "Matthew Daly",
            "email": "matthewbdaly@gmail.com"
        }
    ]
}
```

Next, let's write the outline of our command-line client. We'll load a single class for our processor command. Save this as `app`:

```php
#!/usr/bin/env php
<?php

require __DIR__.'/vendor/autoload.php';

use Symfony\Component\Console\Application;
use Matthewbdaly\LetterClassifier\Commands\Processor;

$application = new Application();
$application->add(new Processor());
$application->run();
```

Next, we create our command. Save this as `src/Commands/Processor.php`:

```php
<?php

namespace Matthewbdaly\LetterClassifier\Commands;

use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Input\InputArgument;
use League\Pipeline\Pipeline;
use Matthewbdaly\LetterClassifier\Stages\ConvertPdfToPng;
use Matthewbdaly\LetterClassifier\Stages\ReadFile;
use Matthewbdaly\LetterClassifier\Stages\Classify;
use Matthewbdaly\LetterClassifier\Stages\StripTabs;
use Matthewbdaly\LetterClassifier\Stages\GetPolicyNumber;

class Processor extends Command
{
    protected function configure()
    {
        $this->setName('process')
            ->setDescription('Processes a file')
            ->setHelp('This command processes a file')
            ->addArgument('file', InputArgument::REQUIRED, 'File to process');
    }

    protected function execute(InputInterface $input, OutputInterface $output)
    {
        $file = $input->getArgument('file');
        $pipeline = (new Pipeline)
            ->pipe(new ConvertPdfToPng)
            ->pipe(new ReadFile)
            ->pipe(new StripTabs)
            ->pipe(new GetPolicyNumber)
            ->pipe(new Classify);
        $response = $pipeline->process($file);
        $output->writeln("Classification is ".$response['classification']);
        $output->writeln("Policy number is ".$response['policy']);
    }
}
```

Note how our command accepts the file name as an argument. We then instantiate our pipeline and pass it through a series of classes, each of which has a single role. Finally, we retrieve our response and output it.

With that done, we can move on to implementing our first step. Save this as `src/Stages/ConvertPdfToPng.php`:

```php
<?php

namespace Matthewbdaly\LetterClassifier\Stages;

use Imagick;

class ConvertPdfToPng
{
    public function __invoke($file)
    {
        $tmp = tmpfile();
        $uri = stream_get_meta_data($tmp)['uri'];
        $img = new Imagick();
        $img->setResolution(300, 300);
        $img->readImage($file);
        $img->setImageDepth(8);
        $img->setImageFormat('png');
        $img->writeImage($uri);
        return $tmp;
    }
}
```

This stage fetches the file passed through, and converts it into a PNG file, stores it as a temporary file, and returns a reference to it. The output of this stage will then form the input of the next. This is how pipelines work, and it makes it easy to break up a complex process into multiple steps that can be reused in different places, facilitating easier code reuse and making your code simpler to understand and reason about.

Our next step carries out optical character recognition. Save this as `src/Stages/ReadFile.php`:

```php
<?php

namespace Matthewbdaly\LetterClassifier\Stages;

use thiagoalessio\TesseractOCR\TesseractOCR;

class ReadFile
{
    public function __invoke($file)
    {
        $uri = stream_get_meta_data($file)['uri'];
        $ocr = new TesseractOCR($uri);
        return $ocr->lang('eng')->run();
    }
}
```

As you can see, this accepts the link to the temporary file as an argument, and runs Tesseract on it to retrieve the text. Note that we specify a language of `eng` - if you want to use a language other than English, you should specify it here.

At this point, we should have some usable text, but there may be unknown amounts of whitespace, so our next step uses a regex to strip them out. Save this as `src/Stages/StripTabs.php`:

```php
<?php

namespace Matthewbdaly\LetterClassifier\Stages;

class StripTabs
{
    public function __invoke($content)
    {
        return trim(preg_replace('/\s+/', ' ', $content));
    }
}
```

With our whitespace issue sorted out, we now need to retrieve the policy number the communication should be filed under. These are generally regular alphanumeric patterns, so regexes are a suitable way of matching them. As this is a proof of concept, we'll assume a very simple pattern for policy numbers in that they will consist of between seven and nine digits. Save this as `src/Stages/GetPolicyNumber.php`:

```php
<?php

namespace Matthewbdaly\LetterClassifier\Stages;

class GetPolicyNumber
{
    public function __invoke($content)
    {
        $matches = [];
        $policyNumber = '';
        preg_match('/\d{7,9}/', $content, $matches);
        if (count($matches)) {
            $policyNumber = $matches[0];
        }
        return [
            'content' => $content,
            'policy' => $policyNumber
        ];
    }
}
```

Finally, we're onto the really tough part - using machine learning to classify the letters. Save this as `src/Stages/Classify.php`:

```php
<?php

namespace Matthewbdaly\LetterClassifier\Stages;

use Phpml\Dataset\CsvDataset;
use Phpml\Dataset\ArrayDataset;
use Phpml\FeatureExtraction\TokenCountVectorizer;
use Phpml\Tokenization\WordTokenizer;
use Phpml\CrossValidation\StratifiedRandomSplit;
use Phpml\FeatureExtraction\TfIdfTransformer;
use Phpml\Metric\Accuracy;
use Phpml\Classification\SVC;
use Phpml\SupportVectorMachine\Kernel;

class Classify
{
    protected $classifier;

    protected $vectorizer;

    protected $tfIdfTransformer;

    public function __construct()
    {
        $this->dataset = new CsvDataset('data/letters.csv', 1);
        $this->vectorizer = new TokenCountVectorizer(new WordTokenizer());
        $this->tfIdfTransformer = new TfIdfTransformer();
        $samples = [];
        foreach ($this->dataset->getSamples() as $sample) {
                $samples[] = $sample[0];
        }
        $this->vectorizer->fit($samples);
        $this->vectorizer->transform($samples);
        $this->tfIdfTransformer->fit($samples);
        $this->tfIdfTransformer->transform($samples);
        $dataset = new ArrayDataset($samples, $this->dataset->getTargets());
        $randomSplit = new StratifiedRandomSplit($dataset, 0.1);
        $this->classifier = new SVC(Kernel::RBF, 10000);
        $this->classifier->train($randomSplit->getTrainSamples(), $randomSplit->getTrainLabels());
        $predictedLabels = $this->classifier->predict($randomSplit->getTestSamples());
        echo 'Accuracy: '.Accuracy::score($randomSplit->getTestLabels(), $predictedLabels);
    }

    public function __invoke(array $message)
    {
        $newSample = [$message['content']];
        $this->vectorizer->transform($newSample);
        $this->tfIdfTransformer->transform($newSample);
        $message['classification'] = $this->classifier->predict($newSample)[0];
        return $message;
    }
}
```

In our constructor, we train up our model by passing our sample data through the following steps:

* First, we use the token count vectorizer to convert our samples to a vector of token counts - replacing every word with a number and keeping track of how often that word occurs.
* Next, we use `TfIdfTransformer` to get statistics about how important a word is in a document.
* Then we instantiate our classifier and train it on a random subset of our data.
* Finally, we pass our message to our now-trained classifier and see what it tells us.

Now, bear in mind I don't have a background in machine learning and this is the first time I've done anything with machine learning, so I can't tell you much more than that - if you want to know more I suggest you investigate on your own. In figuring this out I was helped a great deal by [this article on Sitepoint](https://www.sitepoint.com/how-to-analyze-tweet-sentiments-with-php-machine-learning/), so you might want to start there.

The finished application is [on GitHub](https://github.com/matthewbdaly/letter-classifier), and the repository includes a CSV file of training data, as well as the `examples` folder, which contains some example PDF files. You can run it as follows:

```bash
$ php app process examples/Quote.pdf
```

I found that once I had trained it up using the CSV data from the repository, it was around 70-80% accurate, which isn't bad at all considering the comparatively small size of the dataset. If this were genuinely being used in production, there would be an extremely large dataset of historical scanned letters to use for training purposes, so it wouldn't be unreasonable to expect much better results under those circumstances.

Exercises for the reader
------------------------

If you want to develop this concept further, here are some ideas:

* We should be able to correct the model when it's wrong. Add a separate command to train the model by passing through a file and specifying how it should be categorised, eg `php app train File.pdf quote`.
* Try processing information from different sources. For instance, you could replace the first two stages with a stage that pulls all unread emails from a specified mailbox using PHP's IMAP support, or fetching data from the Twitter API. Or you could have a telephony service such as Twilio set up as your voicemail, and automatically transcribe them, then pass the text to PHP ML for classification.
* If you're multilingual, you could try adding a step to sort letters by language and have separate models for classifying in each language

Summary
-------

It's actually quite a sobering thought that *already* it's possible to use techniques like these to produce tools that replace people in various jobs, and as the tooling matures more and more tasks involving classification are going to become amenable to automation using machine learning.

This was my first experience with machine learning and it's been very interesting for me to solve a real-world problem with it. I hope it gives you some ideas about how you could use it too.
