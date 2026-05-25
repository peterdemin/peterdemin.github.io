Precision-Recall
================

Background
----------

I’m familiarizing myself with basic ML concept of Precision-Recall curve
to build intuition around it.

My source:
https://scikit-learn.org/dev/auto_examples/model_selection/plot_precision_recall.html

First, we’ll load a small toy dataset
-------------------------------------

Following the SciKit doc, we’ll use Iris (flower, not part of an eye, or
godess).

.. code:: ipython3

    import numpy as np
    from sklearn.datasets import load_iris
    from sklearn.model_selection import train_test_split
    from sklearn.metrics._ranking import precision_recall_curve
    import pandas
    from sklearn.pipeline import make_pipeline
    from sklearn.preprocessing import StandardScaler
    from sklearn.svm import LinearSVC
    from sklearn.metrics import PrecisionRecallDisplay
    
    random_state = np.random.RandomState(3)
    
    X, y = load_iris(return_X_y=True)

Mess it up
----------

The dataset has 150 records, 4 floating-point flower properties (like
length) for X, and specific flower species label for Y (0, 1, 2). There
are 310 Iris species, but this small dataset has only 3. So, it’s kinda
multilabel. We don’t need that, for precision-recall we need something
binary. So we trim both X and Y to only keep records for ``Y=0`` aka
False and ``1`` aka True.

.. code:: ipython3

    X, y = X[y<2], y[y<2]
    pandas.DataFrame(X)




.. raw:: html

    <div>
    <style scoped>
        .dataframe tbody tr th:only-of-type {
            vertical-align: middle;
        }
    
        .dataframe tbody tr th {
            vertical-align: top;
        }
    
        .dataframe thead th {
            text-align: right;
        }
    </style>
    <table border="1" class="dataframe">
      <thead>
        <tr style="text-align: right;">
          <th></th>
          <th>0</th>
          <th>1</th>
          <th>2</th>
          <th>3</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <th>0</th>
          <td>5.1</td>
          <td>3.5</td>
          <td>1.4</td>
          <td>0.2</td>
        </tr>
        <tr>
          <th>1</th>
          <td>4.9</td>
          <td>3.0</td>
          <td>1.4</td>
          <td>0.2</td>
        </tr>
        <tr>
          <th>2</th>
          <td>4.7</td>
          <td>3.2</td>
          <td>1.3</td>
          <td>0.2</td>
        </tr>
        <tr>
          <th>3</th>
          <td>4.6</td>
          <td>3.1</td>
          <td>1.5</td>
          <td>0.2</td>
        </tr>
        <tr>
          <th>4</th>
          <td>5.0</td>
          <td>3.6</td>
          <td>1.4</td>
          <td>0.2</td>
        </tr>
        <tr>
          <th>...</th>
          <td>...</td>
          <td>...</td>
          <td>...</td>
          <td>...</td>
        </tr>
        <tr>
          <th>95</th>
          <td>5.7</td>
          <td>3.0</td>
          <td>4.2</td>
          <td>1.2</td>
        </tr>
        <tr>
          <th>96</th>
          <td>5.7</td>
          <td>2.9</td>
          <td>4.2</td>
          <td>1.3</td>
        </tr>
        <tr>
          <th>97</th>
          <td>6.2</td>
          <td>2.9</td>
          <td>4.3</td>
          <td>1.3</td>
        </tr>
        <tr>
          <th>98</th>
          <td>5.1</td>
          <td>2.5</td>
          <td>3.0</td>
          <td>1.1</td>
        </tr>
        <tr>
          <th>99</th>
          <td>5.7</td>
          <td>2.8</td>
          <td>4.1</td>
          <td>1.3</td>
        </tr>
      </tbody>
    </table>
    <p>100 rows × 4 columns</p>
    </div>



.. code:: ipython3

    y




.. parsed-literal::

    array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
           0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
           0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
           1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
           1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1])



It’s good that it’s binary now, but it’s too easy. If we train a model
on this data now, it will have 100% accuracy, so precision and recall
will look stupied. So, we add noisy features, a whole lot, 100 times
more noise than signal. That will make model to sweat.

.. code:: ipython3

    X = np.concatenate([X, random_state.randn(X.shape[0], 100 * X.shape[1])], axis=1)
    
    pandas.DataFrame(X)




.. raw:: html

    <div>
    <style scoped>
        .dataframe tbody tr th:only-of-type {
            vertical-align: middle;
        }
    
        .dataframe tbody tr th {
            vertical-align: top;
        }
    
        .dataframe thead th {
            text-align: right;
        }
    </style>
    <table border="1" class="dataframe">
      <thead>
        <tr style="text-align: right;">
          <th></th>
          <th>0</th>
          <th>1</th>
          <th>2</th>
          <th>3</th>
          <th>4</th>
          <th>5</th>
          <th>6</th>
          <th>7</th>
          <th>8</th>
          <th>9</th>
          <th>...</th>
          <th>394</th>
          <th>395</th>
          <th>396</th>
          <th>397</th>
          <th>398</th>
          <th>399</th>
          <th>400</th>
          <th>401</th>
          <th>402</th>
          <th>403</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <th>0</th>
          <td>5.1</td>
          <td>3.5</td>
          <td>1.4</td>
          <td>0.2</td>
          <td>1.788628</td>
          <td>0.436510</td>
          <td>0.096497</td>
          <td>-1.863493</td>
          <td>-0.277388</td>
          <td>-0.354759</td>
          <td>...</td>
          <td>-0.041844</td>
          <td>-0.272736</td>
          <td>-2.676521</td>
          <td>-0.430101</td>
          <td>0.084964</td>
          <td>1.097779</td>
          <td>2.046333</td>
          <td>0.666988</td>
          <td>0.079092</td>
          <td>-0.964763</td>
        </tr>
        <tr>
          <th>1</th>
          <td>4.9</td>
          <td>3.0</td>
          <td>1.4</td>
          <td>0.2</td>
          <td>0.089053</td>
          <td>0.778897</td>
          <td>1.264645</td>
          <td>-0.880511</td>
          <td>0.236406</td>
          <td>0.815604</td>
          <td>...</td>
          <td>-0.695176</td>
          <td>0.350235</td>
          <td>0.877156</td>
          <td>-1.154259</td>
          <td>0.167770</td>
          <td>0.247067</td>
          <td>-0.334747</td>
          <td>-0.487161</td>
          <td>-1.854910</td>
          <td>1.148821</td>
        </tr>
        <tr>
          <th>2</th>
          <td>4.7</td>
          <td>3.2</td>
          <td>1.3</td>
          <td>0.2</td>
          <td>-0.932924</td>
          <td>-1.240371</td>
          <td>0.657913</td>
          <td>-1.832275</td>
          <td>0.963271</td>
          <td>0.434219</td>
          <td>...</td>
          <td>1.220892</td>
          <td>-2.011595</td>
          <td>-1.504712</td>
          <td>-0.149936</td>
          <td>0.027270</td>
          <td>-1.604372</td>
          <td>-0.674309</td>
          <td>-0.455614</td>
          <td>-0.497364</td>
          <td>-0.518032</td>
        </tr>
        <tr>
          <th>3</th>
          <td>4.6</td>
          <td>3.1</td>
          <td>1.5</td>
          <td>0.2</td>
          <td>-0.140283</td>
          <td>0.830035</td>
          <td>0.686235</td>
          <td>0.538731</td>
          <td>0.221271</td>
          <td>-0.770385</td>
          <td>...</td>
          <td>-0.290146</td>
          <td>1.390606</td>
          <td>-1.455962</td>
          <td>0.569578</td>
          <td>0.006109</td>
          <td>0.859871</td>
          <td>-0.444911</td>
          <td>0.753343</td>
          <td>-0.467831</td>
          <td>0.663535</td>
        </tr>
        <tr>
          <th>4</th>
          <td>5.0</td>
          <td>3.6</td>
          <td>1.4</td>
          <td>0.2</td>
          <td>-1.922484</td>
          <td>0.528894</td>
          <td>0.782406</td>
          <td>-1.553416</td>
          <td>0.890992</td>
          <td>-1.091646</td>
          <td>...</td>
          <td>1.027371</td>
          <td>-1.060412</td>
          <td>0.745221</td>
          <td>-1.398008</td>
          <td>0.078579</td>
          <td>-1.648937</td>
          <td>-0.172256</td>
          <td>-0.816176</td>
          <td>-1.003245</td>
          <td>0.214830</td>
        </tr>
        <tr>
          <th>...</th>
          <td>...</td>
          <td>...</td>
          <td>...</td>
          <td>...</td>
          <td>...</td>
          <td>...</td>
          <td>...</td>
          <td>...</td>
          <td>...</td>
          <td>...</td>
          <td>...</td>
          <td>...</td>
          <td>...</td>
          <td>...</td>
          <td>...</td>
          <td>...</td>
          <td>...</td>
          <td>...</td>
          <td>...</td>
          <td>...</td>
          <td>...</td>
        </tr>
        <tr>
          <th>95</th>
          <td>5.7</td>
          <td>3.0</td>
          <td>4.2</td>
          <td>1.2</td>
          <td>-1.048244</td>
          <td>0.062068</td>
          <td>-0.304341</td>
          <td>-0.516236</td>
          <td>0.432118</td>
          <td>0.675260</td>
          <td>...</td>
          <td>1.365158</td>
          <td>0.914614</td>
          <td>0.020456</td>
          <td>-0.314531</td>
          <td>1.468110</td>
          <td>1.703369</td>
          <td>0.409053</td>
          <td>-0.293020</td>
          <td>-0.038827</td>
          <td>-0.759583</td>
        </tr>
        <tr>
          <th>96</th>
          <td>5.7</td>
          <td>2.9</td>
          <td>4.2</td>
          <td>1.3</td>
          <td>1.586293</td>
          <td>-0.490875</td>
          <td>-1.612975</td>
          <td>0.097659</td>
          <td>-0.170520</td>
          <td>1.269662</td>
          <td>...</td>
          <td>-1.006722</td>
          <td>1.040696</td>
          <td>-1.780113</td>
          <td>0.576967</td>
          <td>0.222845</td>
          <td>-0.030648</td>
          <td>1.560297</td>
          <td>1.289232</td>
          <td>0.005855</td>
          <td>-1.530362</td>
        </tr>
        <tr>
          <th>97</th>
          <td>6.2</td>
          <td>2.9</td>
          <td>4.3</td>
          <td>1.3</td>
          <td>0.845536</td>
          <td>-1.045338</td>
          <td>-1.111983</td>
          <td>-0.156758</td>
          <td>0.316664</td>
          <td>0.104065</td>
          <td>...</td>
          <td>0.167184</td>
          <td>0.398998</td>
          <td>0.104368</td>
          <td>1.282921</td>
          <td>-1.973232</td>
          <td>1.331549</td>
          <td>1.144706</td>
          <td>0.378739</td>
          <td>0.497428</td>
          <td>0.880610</td>
        </tr>
        <tr>
          <th>98</th>
          <td>5.1</td>
          <td>2.5</td>
          <td>3.0</td>
          <td>1.1</td>
          <td>0.252259</td>
          <td>1.805827</td>
          <td>-0.505050</td>
          <td>0.088796</td>
          <td>-0.059348</td>
          <td>-1.280433</td>
          <td>...</td>
          <td>-1.077416</td>
          <td>0.696924</td>
          <td>-0.582393</td>
          <td>-1.444338</td>
          <td>-1.175554</td>
          <td>0.287162</td>
          <td>-1.674579</td>
          <td>1.712218</td>
          <td>-0.191547</td>
          <td>-0.217705</td>
        </tr>
        <tr>
          <th>99</th>
          <td>5.7</td>
          <td>2.8</td>
          <td>4.1</td>
          <td>1.3</td>
          <td>-0.843062</td>
          <td>-1.487719</td>
          <td>-0.123779</td>
          <td>0.488852</td>
          <td>-2.191656</td>
          <td>-2.167447</td>
          <td>...</td>
          <td>0.842751</td>
          <td>-1.043519</td>
          <td>1.658296</td>
          <td>-0.766213</td>
          <td>-0.651521</td>
          <td>-3.106978</td>
          <td>-2.366992</td>
          <td>-0.659680</td>
          <td>-1.394787</td>
          <td>1.489548</td>
        </tr>
      </tbody>
    </table>
    <p>100 rows × 404 columns</p>
    </div>



Split to train and test data
----------------------------

Because we’re such great data scientists, we can’t even think about
testing the model on training data even for educational purposes.

.. code:: ipython3

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.5, random_state=random_state)

.. code:: ipython3

    classifier = make_pipeline(StandardScaler(), LinearSVC(random_state=random_state))
    classifier.fit(X_train, y_train);

Boom, we’ve got a binary classifier model
-----------------------------------------

We trained it to predict the likelyhood of smoking pile of garbage being
Iris flower of species number 1. For whatever ``4 + 40800`` floats we
throw in, the model returns a *score* of how likely the label is 1.
Let’s take a look at the test output.

.. code:: ipython3

    y_score = classifier.decision_function(X_test)
    pandas.DataFrame.from_dict({
        '$Y_{score}$': y_score,
        '$Y_{true}$': y_test,
    }).plot();



.. image:: /12_articles/images/12.64_11_0.png


Note how :math:`Y_{score}` values are small signed floating point
numbers unlike label, which are either 0 or 1. That’s because the score
doesn’t directly map to the label. Very loosely, it’s a likelyhood of
input having labeled as 1, but not in statistical terms. Let’s say,
there is a correlation. Ok, that might be not the best way to present
this data. How about we plot only scores, and paint it red for label 1
and blue for label 0.

.. code:: ipython3

    pandas.DataFrame.from_dict({
        '$Y_{score}$': y_score,
        '$Y_{true}$': y_test,
    }).reset_index().plot(
        kind='scatter',
        x='index',
        y='$Y_{score}$',
        c='$Y_{true}$',
        colormap='bwr',
    );



.. image:: /12_articles/images/12.64_13_0.png


That easier on the eye. We can see that dots at the top are red, dots at
the bottom are blue, and in the middle there’s a mix. To actually tell,
if the score predicts the label to be 1, we need to have a threshold.
With the threshold, we’ll be able to say, okay, everything above this
magical number has label 1.

Let’s build some curves
-----------------------

Scikit learn provides handy implementation for drawing the P/R curve,
let’s take a look, so we know what good looks like.

.. code:: ipython3

    display = PrecisionRecallDisplay.from_predictions(
        y_test, y_score, name="LinearSVC", plot_chance_level=True
    ).ax_.set_title("2-class Precision-Recall curve")



.. image:: /12_articles/images/12.64_15_0.png


Beautiful, it’s like a staircase that mostly goes down, except half of
the time it goes up. Definitely tells me a lot about the quality of this
model (it doesn’t).

Let’s get under the hood
------------------------

First, we’ll sort the “true” labels (y_test) and the predicted scores
(y_score) together by score.

.. code:: ipython3

    score_indices = np.argsort(y_score)
    sy_score = y_score[score_indices]
    sy_test = y_test[score_indices]
    pandas.DataFrame.from_dict({'$Y_{true}$': sy_test, '$Y_{score}$': sy_score}).plot();



.. image:: /12_articles/images/12.64_17_0.png


Looks good, very organized. Y_score grows monotonically through its
range, while y_true jumps up and down like crazy. But if we squeeze hard
enough, we’ll see that we have more 1’s on the right side. Actually,
let’s do that color trick again.

.. code:: ipython3

    (pandas.DataFrame.from_dict({'$Y_{score}$': sy_score, '$Y_{true}$': sy_test})
           .reset_index()
           .plot(kind='scatter', x='index', y='$Y_{score}$', c='$Y_{true}$', colormap='bwr'));



.. image:: /12_articles/images/12.64_19_0.png


Nice, good job. We can eye-ball that the right threshold for y_score is
around 0, maybe 0.1. The P/R curve will help us pick the right number
for we are the professionals and never eye-ball shit.

Precision, recall, and threshold
--------------------------------

Let’s use this handy function from scikit to compute precision, recall,
and threshold. It takes ``y_test`` as ``y_true`` - the true test labels
from the dataset, and ``y_score`` - the predicted score. It returns
three lists of floats of the same length as the score and true labels.

In mathematical notation:

-  :math:`N` - number of labels, same as number of scores.
-  :math:`Y` - ``y_true`` - the true (test) label for the record.
-  :math:`\hat{Y}` - ``y_score`` - the predicted score.
-  :math:`P=\sum_{i=0}^{N}{Y_i}` - total number of positive test labels.

It sorts :math:`(Y, \hat{Y})` pairs by :math:`\hat{Y}`. And then
iterates over them while running cumulative sums and doing simple math.
At each iteration of the loop it calculates precision and recall at this
score threshold:

-  :math:`S_i=\hat{Y_{i}}` - append the current score to the list of
   *thresholds*.
-  :math:`T_i=\sum_{k=0}^{i}{(Y_k=1)}` - cumulative count of *true
   positives* so far.
-  :math:`P_i = \frac{T_i}{i}` - calculate precision at ``i`` as the
   number of true positives divided by the number of records already
   seen.
-  :math:`R_i = \frac{T_i}{P}` - calculate recall at ``i`` as the number
   of true positives divided by total number of true labels.

English, please
---------------

We want to find a *threshold* such that any ``y_score`` above it means
the label is 1. We saw that the prediction is not always accurate and
the data is noisy, so we need to have a number. The number will tell us
how confident we are in the label prediction. The name for it is
precision. When the precision is 1 it means that we never make mistake
by predicting label 1 to something that is label 0. It says nothing
about the other kind of mistake, though. Predicting label 0 to what is
actually label 1 is okay, and doesn’t hurt the precision. Maybe
*conservative* is a good word, at least *asymmetrical*. Of course,
everybody in this data science field undestands it, and never bothers to
clarify this detail, just calling it a precision.

Great, back to the threshold. If the treshold is set below the minimum
observed score, it means that everything is label 1, and nothing is
label 0. The recall for such threshold would be 100%, it finds all true
positives. The precision would point to whatever the proportion of
labels is in the dataset. It’s not zero, because it’s sometimes right,
it’s not 100% because it sometimes wrong.

On the other hand, if the score threshold is set above the maximum
observed value, everything gets label 0. Super conservative. The
precision of such system is 100%, because it never make a mistake of
saying that the label is 1 for something that is 0. Those who do
nothing, never make mistakes. The recall is zero, though, as nothing is
ever found.

Computation details
-------------------

We want is to calculate precision and recall for every possible score.
But we can’t cover all possible numbers. Luckily, we don’t need to.
Because our evaluation dataset is finite, and between the adjacent
points, the precision and recall is the same. So instead of going over
all possible numbers, we just need to iterate over all observed scores.

For each score we want to know how many points were below it, and how
many of those had the true label of 1. This asks for some sorting. The
trick is to sort all pairs (of score and true label) by score in a
*descending order*. Then, computing the threshold becomes very easy,
it’s just the score at every point.

For every threshold (assuming unique score thresholds) we want to find
precision and recall. Being at this threshold means that all the points
below are predicted to be labeled 0, and all the points above are
predicted as 1. The precision of such prediction is the number of points
above that are actually labeled 1, divided by the total number of points
above. We, professionals, say: number of *true positives* divided by sum
of *true positives* an *false positives*. In other words, we divide the
real number of positive values by the number of positive predictions,
and that’s the precision at this threshold.

We could have stopped here, you know. You want your predictions to be
correct 90% of the times, pick the score threshold where your precision
is closest to 0.9.

But we’re curious, as the real professional data scientists are. So we
need to know more about the data. We’ll calculate the recall. Recall is
a funky term, that shows how many *true positives* we have predicted out
all the positive values. We take the number of *true positives* seen so
far, just like for the precision. But now we divide it by the total
number of points with true label 1 in the evaluation dataset. That’s
right, the denominator for the recall is constant at each iteration, and
the nominator is ever-increasing. At the beginning of the loop when the
score threshold is at the highest, and we haven’t observed any true
positives, the recall is zero. At the end, when score threshold is at
the lowest score, the recall is the number of *true positives* divided
by the total number of points with label 1.

.. code:: ipython3

    precisions, recalls, thresholds = precision_recall_curve(y_test, y_score)
    thresholds = np.append(thresholds, float('nan'))
    precisions.shape, recalls.shape, thresholds.shape




.. parsed-literal::

    ((51,), (51,), (51,))



Let’s take a look
-----------------

Okay, that was all good knowledge, thank you very much, but can you show
me some examples? How about we plot these 3 sequences against each
other?

First, all three lines on the same chart.

.. code:: ipython3

    pandas.DataFrame.from_dict({'$Precision$': precisions, '$Recall$': recalls, '$Threshold$': thresholds}).plot();



.. image:: /12_articles/images/12.64_23_0.png


Magnificient! But not very helpful. We see that the threshold are just
sorted scores. We see recall starting at 1.0 and going down to zero. And
the precision starts somewhere around 0.5 and goes up (and sometimes
down) to 1.0.

How about we put recall as the X axis, and plot precision and thresholds
as Y.

.. code:: ipython3

    pandas.DataFrame.from_dict({'$Precision$': precisions, '$Recall$': recalls, '$Threshold$': thresholds}).plot(x='$Recall$');



.. image:: /12_articles/images/12.64_25_0.png


Yeah, that’s very close to what scikit plotted for us above. The steps
are not as pronounced, but that’s fine.

How about we go crazy and plot both precision and recall against the
threshold?

.. code:: ipython3

    pandas.DataFrame.from_dict({'$Precision$': precisions, '$Recall$': recalls, '$Threshold$': thresholds}).plot(x='$Threshold$');



.. image:: /12_articles/images/12.64_27_0.png


The lines cross! What a coincedence (it’s not). Funny, that the
threshold of the cross is about where we (no, you, against my better
judgement) eye-balled the sweet spot. Is there any theoretical
significance to this spot? I don’t think so. You don’t get the biggest
bang for your buck by jerking target precision for the system after
every evaluation. You want the target precision to be good and stable,
and preferrably decided by someone who understands the product, the
users, and also that murky statistical part, that precision doesn’t take
into account *false negatives* - predictions of label 0 when it’s
actually 1.
