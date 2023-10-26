# Reaction to interview rejection emails

> Resilience - the ability of a person to adjust to or recover readily from illness, adversity, major life changes, etc.

Receiving a rejection email is hard, and the first reaction is to curse.
The second reaction is to close the email and forget about it.
The alternative is to acknowledge the emotions, let them sink, and write a response to make the best out of a bad situation.

The goal of going through the interview process is to get hired.
The means of the interview is talking to the team.
In a vein of emotional intelligence, we can flip the situation and consider the interviews as a networking experience.

The goal of networking is to establish professional connections that might be helpful in the future.
So, what should you write in response? Here's a template I adopted from [Indeed article](https://www.indeed.com/career-advice/finding-a-job/how-to-respond-to-a-job-rejection-email):

```
Hi {{ recruiter_name }},

Thank you for getting back to me about your hiring decision.
While I’m disappointed to hear that I was not selected for the {{ position_title }} position,
I greatly appreciate the opportunity to interview for the job and meet some of the members of your team.
I thoroughly enjoyed learning more about your organization and would love
to be considered for any future job openings that may become available.

Thank you again for your time and consideration, {{ recruiter_name }}.
I hope our paths cross again, and I wish you and the rest of the team at {{ company_name }} all the best moving forward.

Sincerely,
{{ full_name }}.
```

## Try it out

<!-- Input fields -->
<label for="fullName">Full Name:</label>
<input type="text" id="fullName" placeholder="Enter your name">

<label for="recruiterName">Recruiter Name:</label>
<input type="text" id="recruiterName" placeholder="Enter recruiter's name">

<label for="companyName">Company Name:</label>
<input type="text" id="companyName" placeholder="Enter company's name">

<label for="positionTitle">Position title:</label>
<input type="text" id="positionTitle" placeholder="Enter position (Software Engineer)">

<!-- Placeholder for rendered template -->
<div id="output"><i>The text will appear as you change fill the form</i></div>
<button id="copyButton">Copy to Clipboard</button>

<script>
    function renderTemplate() {
        const fullName = document.getElementById('fullName').value;
        const recruiterName = document.getElementById('recruiterName').value;
        const companyName = document.getElementById('companyName').value;
        const positionTitle = document.getElementById('positionTitle').value;
        document.getElementById('output').innerHTML = `Hi ${recruiterName},
<br/><br/>
Thank you for getting back to me about your hiring decision.
While I’m disappointed to hear that I was not selected for the ${positionTitle} position,
I greatly appreciate the opportunity to interview for the job and meet some of the members of your team.
I thoroughly enjoyed learning more about your organization and would love
to be considered for any future job openings that may become available.
<br/><br/>
Thank you again for your time and consideration, ${recruiterName}.
I hope our paths cross again, and I wish you and the rest of the team at ${companyName} all the best moving forward.
<br/><br/>
Sincerely,<br />
${fullName}.`;
    }

    function copyToClipboard() {
        const textToCopy = document.getElementById('output').textContent;
        const textArea = document.createElement('textarea');
        textArea.value = textToCopy;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
    }

    document.getElementById('fullName').addEventListener('input', renderTemplate);
    document.getElementById('recruiterName').addEventListener('input', renderTemplate);
    document.getElementById('companyName').addEventListener('input', renderTemplate);
    document.getElementById('positionTitle').addEventListener('input', renderTemplate);
    document.getElementById('copyButton').addEventListener('click', copyToClipboard);
    renderTemplate();
</script>
