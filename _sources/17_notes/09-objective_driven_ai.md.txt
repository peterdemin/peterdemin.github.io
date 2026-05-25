# Objective-Driven AI

Video: [The Impact of chatGPT talks (2023) - Keynote address by Prof. Yann LeCun (NYU/Meta)](https://www.youtube.com/watch?v=vyqXLJsmsrk)
Slides: [09-lecun-20230721-mit.pdf](downloads/09-lecun-20230721-mit.pdf)

## Notes

- Autoregressive LLMs can not be fixed to become factual.
  If probability of the next token being wrong is e, the probability of
  the answer of n tokens being correct is ``P(n) = (1 - e) ** n``.
  In other words, the answer diverges from the correct one exponentially to the length.
- LLMs can not plan or reason the way humans do.
- Objective-driven AI has a model of the world that predicts its future state, and produce actions as an optimization of cost to achieve the desired state. Optimization is performed during inference, not training.
- Yann argues we need to abandon generative models.
  Because they can only predict an average of all possible outcomes (blurry).
- In image generation Joint Embedding model are the most successfull. Instead of predicting the value of *y*, the predict the abstract representation of *y*. For example, instead of predicting the shape of every ripple on the water, they just predict the ripples concept.
- You take an image and distort it with noise, and then train the encoder to learn that representation of original image and the distorted on should be the same. Instead of learning to reconstruct the original image.
- But if you're not careful, the system will learn to predict every representation to be the same constant.
- The solution is using energy-based models that encode the difference between *x* and *y* assigning higher value to bigger difference.
- Hierarchical planning through energy minimazation is Turing complete.
- At the high level, Yann proposes to:
  - Abandon generative models in favor joint-embedding architectures.
  - Abandon probabilistic model in favor of energy-based models.
  - Abandon contrastive methods in favor of regularized methods.
  - Abandon Reinforcement Learning in favor of model-predictive control.
  - Use RL only when planning doesn’t yield the predicted outcome, to adjust the world model or the critic.
- Most of the human knowledge is not linguistic.
  It's more intuitive manipulation of mental models.
  We then express it in language and formal facts and laws to make it discreet and communicable.

## Conclusion

Yann considers LLM as a final output layer of AI, which fluently communicates the result of the thinking layer.
Energy-based model is fit for reasoning and planning and he thinks this is the best approach at the moment.
