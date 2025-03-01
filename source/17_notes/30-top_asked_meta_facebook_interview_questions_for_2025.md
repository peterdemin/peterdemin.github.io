# Top Asked Meta (Facebook) Interview Questions for 2025

Article: <https://www.simplilearn.com/facebook-interview-questions-answers-article>

## Problems

Here's the list of problems from the article:

- You are given a set of random numbers. Write a code to shift all the zeros to the left. 
- Write a code to merge overlapping intervals. 
- You are given a binary tree. Can you in-place convert it into a doubly-linked list?
- Can you print the given binary tree's nodes level by level, i.e., print all nodes of level 1 first, then level 2, and so on? 
- 'The sky is dark blue.' Can you reverse the order of this string? 
- You are given four words - apple, pear, pier, and pie. Can this be completely segmented? If yes, then how? 
- Here is a list of daily stock prices. Return the buy and sell prices to maximize the profit. 

## Solutions

I wanted to get an idea of how hard the problems are, but didn't want to spend time solving them.
I let GPT 4o do it for me, and focused on writing tooling to execute and verify all code snippets on this page.

### Shift zeros left

```python
def shift_zeros_left(arr):
    non_zero_pos = len(arr) - 1  # Position to place the next non-zero element

    # Traverse from right to left
    for i in range(len(arr) - 1, -1, -1):
        if arr[i] != 0:
            arr[non_zero_pos] = arr[i]
            non_zero_pos -= 1

    # Fill remaining positions with zeros
    for i in range(non_zero_pos + 1):
        arr[i] = 0

    return arr

# ✅ Test cases
assert shift_zeros_left([0, 1, 0, 3, 12, 0, 5]) == [0, 0, 0, 1, 3, 12, 5]
assert shift_zeros_left([1, 2, 3, 4, 0]) == [0, 1, 2, 3, 4]
assert shift_zeros_left([0, 0, 0, 0]) == [0, 0, 0, 0]
assert shift_zeros_left([1, 2, 3, 4, 5]) == [1, 2, 3, 4, 5]
assert shift_zeros_left([0, 1, 0, 0, 0, 2, 3, 0]) == [0, 0, 0, 0, 0, 1, 2, 3]
assert shift_zeros_left([0]) == [0]
assert shift_zeros_left([1]) == [1]
assert shift_zeros_left([0, 0, 1, 2, 3, 0, 4, 5]) == [0, 0, 0, 1, 2, 3, 4, 5]
```

### Merge intervals

```python
from functools import reduce

def merge_intervals(intervals):
    return reduce(lambda m, c: (m[-1].__setitem__(1, max(m[-1][1], c[1])) or m) if m and c[0] <= m[-1][1] else (m.append(c) or m),
                  sorted(intervals), [])

# Comprehensive test cases
assert merge_intervals([[1, 3], [2, 6], [8, 10], [15, 18]]) == [[1, 6], [8, 10], [15, 18]]
assert merge_intervals([[1, 4], [4, 5]]) == [[1, 5]]
assert merge_intervals([[1, 10], [2, 6], [8, 10], [15, 18]]) == [[1, 10], [15, 18]]
assert merge_intervals([[6, 8], [1, 9], [2, 4], [4, 7]]) == [[1, 9]]
assert merge_intervals([[1, 3], [7, 9], [4, 6]]) == [[1, 3], [4, 6], [7, 9]]
assert merge_intervals([]) == []
assert merge_intervals([[1, 5]]) == [[1, 5]]
assert merge_intervals([[1, 2], [3, 4], [5, 6]]) == [[1, 2], [3, 4], [5, 6]]  # No merges
assert merge_intervals([[1, 10], [2, 3], [4, 5], [6, 7], [8, 9]]) == [[1, 10]]  # Fully merged
assert merge_intervals([[1, 100], [50, 200], [150, 300]]) == [[1, 300]]  # Large intervals
```

### Tree to double-linked list

```python
class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val, self.left, self.right = val, left, right

def tree_to_doubly_linked_list(root):
    """Converts a binary tree into a doubly linked list in-place."""
    def inorder(node):
        nonlocal prev, head
        if not node:
            return
        inorder(node.left)
        if prev:
            prev.right, node.left = node, prev
        else:
            head = node
        prev = node
        inorder(node.right)

    prev, head = None, None
    inorder(root)
    return head

def linked_list_to_list(head):
    """Converts a doubly linked list to a list representation."""
    result = []
    while head:
        result.append(head.val)
        head = head.right
    return result

assert tree_to_doubly_linked_list(None) is None
assert linked_list_to_list(tree_to_doubly_linked_list(TreeNode(1))) == [1]
assert linked_list_to_list(tree_to_doubly_linked_list(TreeNode(3, TreeNode(2, TreeNode(1))))) == [1, 2, 3]
assert linked_list_to_list(tree_to_doubly_linked_list(TreeNode(1, None, TreeNode(2, None, TreeNode(3))))) == [1, 2, 3]
assert linked_list_to_list(tree_to_doubly_linked_list(TreeNode(4, TreeNode(2, TreeNode(1), TreeNode(3)), TreeNode(5)))) == [1, 2, 3, 4, 5]
```

### Tree levels

```python
from collections import deque
from typing import List, Optional

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def level_order_traversal(root: Optional[TreeNode]) -> List[List[int]]:
    """Returns level order traversal of a binary tree."""
    if not root:
        return []
    
    result, queue = [], deque([root])
    while queue:
        level = [queue.popleft() for _ in range(len(queue))]  # Extract nodes at current level
        result.append([node.val for node in level])  # Store node values
        queue.extend(child for node in level for child in (node.left, node.right) if child)  # Add children
    
    return result

# Optimized Tree Builder for Testing
def build_tree(values: List[Optional[int]]) -> Optional[TreeNode]:
    """Builds a binary tree from a list of values (None represents missing nodes)."""
    if not values:
        return None
    nodes = [TreeNode(v) if v is not None else None for v in values]
    queue = deque(nodes)
    root = queue.popleft()
    
    for node in nodes:
        if node:
            node.left = queue.popleft() if queue else None
            node.right = queue.popleft() if queue else None
    
    return root

assert level_order_traversal(None) == []
assert level_order_traversal(build_tree([1])) == [[1]]
assert level_order_traversal(build_tree([1, 2, 3])) == [[1], [2, 3]]
assert level_order_traversal(build_tree([1, 2, 3, 4, 5, None, 7])) == [[1], [2, 3], [4, 5, 7]]
assert level_order_traversal(build_tree([1, 2, None, 3, None, 4])) == [[1], [2], [3], [4]]
assert level_order_traversal(build_tree([1, 2, 3, 4, 5, 6, 7])) == [[1], [2, 3], [4, 5, 6, 7]]
```


### Reverse words

Disqualified. LLM couldn't come up with a meaningful solution that passes the tests.


## Conclusion

Meta uses simple problems, with concise solutions taking under 10 lines of code.
GPT 4o is pretty good at leet code. But it doesn't produce a good code immediately. It takes a few rounds of "Make this code more concise" and "Optimize this code for speed".
Here's my initial prompt template:

Let's practice for coding interviews. Write a solution for the following problem.  After the function, add a comprehensive set of tests using assert statements.
'The sky is dark blue.' Can you reverse the order of this string? 

## P.S.

I took the interview, and the questions were nothing like those.
They were pretty simple, and interviewers didn't care much about the code, focusing more on big-O and brain teasers.
