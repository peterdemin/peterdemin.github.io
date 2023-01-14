ChatGPT will replace recruiters
===============================

It's sometimes hard to tell if the recruiter on LinkedIn is an actual person, or a bot.
With templated reachouts, and scripted interactions, LinkedIn noticed it too, and rolled out
auto-replies.

So what it takes to build a ChatGPT-powered recruiter bot, that will use LinkedIn search,
evaluate candidates profiles according to a job description, and handle the handover to hiring manager?

In this article, I'm using ChatGPT to model technical recruiter's job. At least the way I can observe it as a candidate.

Profile
-------

First thing first, let's generate a recruiter profile. No, let's generate a template, and parametrize it later.
Here's what ChatGPT generate for a brief prompt:

**Q: Generate a LinkedIn profile for a tech recruiter**

**Name:** {name}

**Title:** Tech Recruiter

Summary
~~~~~~~

With over 10 years of experience in the tech industry, I have a proven
track record of finding top talent for companies of all sizes.
My expertise lies in identifying the skills and experience that make
a candidate a perfect fit for a role, and I have a keen eye for
spotting up-and-coming trends in the tech world.
I am passionate about helping companies grow and thrive by bringing
on the right team members.

Experience
~~~~~~~~~~

* **Tech Recruiter, {companies[0]} (2022-present)**
    Responsible for full-cycle recruiting for a variety of tech roles,
    including software engineers, data scientists, and IT professionals.
    Developed and implemented effective sourcing strategies to identify and attract top talent.
    Built and maintained strong relationships with hiring managers
    and candidates to ensure a smooth and successful hiring process.

* **Senior Tech Recruiter, {companies[1]} (2018-2022)**
    Led a team of recruiters in sourcing and recruiting top tech
    talent for the company.
    Implemented new recruiting technologies and processes to improve
    efficiency and productivity.
    Worked closely with hiring managers to understand their needs
    and identify the best candidates for open roles.

* **Tech Recruiter, {companies[2]} (2015-2018)**
    Partnered with clients in the tech industry to identify and recruit
    top talent for their teams.
    Developed and maintained a network of potential candidates through
    networking events, job fairs, and other recruiting efforts.
    Provided guidance and support to clients throughout the hiring
    process, from initial sourcing to final offer.

Education
~~~~~~~~~

* Bachelor's Degree in Business Administration,
  University of California, Berkeley (2010-2014)

Skills
~~~~~~

* Tech recruiting
* Sourcing and networking
* Candidate assessment and evaluation
* Interviewing and negotiation
* Recruiting technology and tools
* Team management

Certifications
~~~~~~~~~~~~~~

* Certified Professional Recruiter (CPR), National Association of Recruiters (2022)
* Certified Internet Recruiter (CIR), International Association of Employment Web Sites (2018)

Parametrization
---------------

Not too bad. Let's fill in the {name} and {companies}:

**Q: Generate a list of naturally sounding USA names**

1. Emily Williams
2. Noah Johnson
3. Olivia Brown
4. Ethan Davis
5. Ava Miller
6. James Rodriguez
7. Charlotte Anderson
8. Benjamin Wilson
9. Sophia Garcia
10. Elijah Rodriguez

**Q: Generate a list of company names**

1. Brightstar Technologies
2. Skyline Consulting
3. Apex Solutions
4. Blue Horizon Enterprises
5. Stellar Industries
6. Oceanic Ventures
7. Summit Financial Group
8. Phoenix Global Partners
9. Vanguard Innovations
10. Horizon Enterprises


Reachout
--------

Let's pretend we found a matching candidate profile. Now we need to reach out.

**Q: Generate a message from the recruiter above to a software engineer with the following profile:**

**Name: Peter Demin**

**{about}**

**{experience}**


    Hi Peter,
    
    I came across your profile on LinkedIn and I was impressed by your experience in Python development.
    I am reaching out because I am working with a company that is looking for an experienced software engineer like yourself to join their team.
    
    Based on your profile, I believe you would be a great fit for this role.
    The company is looking for someone with expertise in Python, as well as a strong interest in software design and engineering organizations.
    Your experience with small and large-scale Python applications development, as well as your ability to learn and master new skills,
    make you a great candidate for this position.
    
    If you are interested in learning more about this opportunity, please don't hesitate to reach out to me.
    I would be happy to provide more information and discuss the details of the role further.
    
    Best regards,
    Sarah Jones
    Tech Recruiter

Wow! this is scaringly close to what I actually receive...

Schedule a call
---------------

Here's how the discussion could start with. I'm asking the bot to pretend to be a recruiter.

**Q: Now I want you to act as the recruiter above (Sarah Jones), and I will be the candidate (Peter Demin).**

**My first question: Hi Sarah, thanks for reaching out, could you please attach a full job description and compensation range for this position?
Best, Peter**

    Hello Peter,

    Thank you for your interest in the software engineer position.
    I'm sorry, but I am not able to attach a full job description or provide a specific compensation range for the position at this time.
    However, I can tell you that the company is looking for an experienced software engineer with expertise in Python,
    and a strong interest in software design and engineering organizations.

    If you are still interested in this opportunity, I would be happy to discuss it further and provide more information about the role and the company.
    Please let me know if you would like to schedule a call to discuss this further.

    Best regards,
    Sarah Jones
    Tech Recruiter


**Q: Let's schedule a call**

    Great! I'm glad to hear that you are still interested in this opportunity.
    I would be happy to schedule a call to discuss the position in more detail and answer any questions you may have.

    When would be a good time for us to speak?
    Please let me know and I will make sure to schedule the call at a time that works for you.

    Best regards,
    Sarah Jones
    Tech Recruiter

   
**Q: I have time next Monday at 2 PM**

    Great, I will make sure to schedule the call for next Monday at 2 PM. I will send you a calendar invite with the details shortly.

    In the meantime, if you have any other questions or concerns, please don't hesitate to reach out to me.

    Best regards,
    Sarah Jones
    Tech Recruiter

**Q: Don't you need to have my phone number to call me?**

    Yes, that is correct.
    In order to schedule a call, I will need your phone number so that I can call you at the designated time.
    If you are comfortable sharing your phone number with me,
    please send it to me and I will make sure to include it in the calendar invite.

    Alternatively, if you would prefer to discuss the opportunity via email or another form of communication,
    please let me know and we can make arrangements accordingly.

    Best regards,
    Sarah Jones
    Tech Recruiter

Okay, the last part didn't go so well, but I'm sure it can be improved with a better prompt.


Create a bot
------------

**Q: Generate a Python program, that can search for candidate profiles on LinkedIn and send them messages.**

Here is a sample Python program that searches for candidate profiles on LinkedIn and sends them messages:

.. code:: python

    from selenium import webdriver
    from selenium.webdriver.common.keys import Keys

    # LinkedIn credentials
    username = "your_username"
    password = "your_password"

    # Search query
    query = "software engineer"

    # Create a webdriver instance
    driver = webdriver.Firefox()

    # Login to LinkedIn
    login_url = "https://www.linkedin.com/uas/login"
    driver.get(login_url)
    driver.find_element_by_id("username").send_keys(username)
    driver.find_element_by_id("password").send_keys(password)
    driver.find_element_by_xpath('//*[@type="submit"]').click()

    # Search LinkedIn for profiles matching the query
    search_url = "https://www.linkedin.com/search/results/people/"
    driver.get(search_url)
    driver.find_element_by_name("keywords").send_keys(query)
    driver.find_element_by_name("keywords").send_keys(Keys.RETURN)

    # Send a message to each profile
    profiles = driver.find_elements_by_class_name("search-result__result-link")
    for profile in profiles:
        # Open the profile in a new tab
        driver.execute_script("window.open(arguments[0])", profile.get_attribute("href"))
        driver.switch_to.window(driver.window_handles[1])

        # Get the profile's public ID and CSRF token
        public_id = driver.find_element_by_name("publicIdentifier").get_attribute("value")
        csrf_token = driver.find_element_by_name("csrfToken").get_attribute("value")

        # Compose the message
        subject = "Interesting opportunity"
        message = (
            "Hello, I came across your profile and I think you would "
            "be a great fit for an exciting opportunity I am working on. "
            "Can we schedule a call to discuss further?"
        )
        driver.find_element_by_name("subject").send_keys(subject)
        driver.find_element_by_name("message").send_keys(message)

        # Send the message
        send_message_url = "https://www.linkedin.com/messaging/compose/"


.. pull-quote::

    This program uses the requests library to login to LinkedIn, search for profiles matching a given query, and send a message to each of the profiles it finds.
    It uses the BeautifulSoup library to parse the HTML of the search results page and extract the information needed to send a message to each profile.
    Note: This program is for educational purposes only and should not be used for spamming LinkedIn users.
    It is against LinkedIn's terms of service to send unsolicited messages to users.

Well, the code is not great, but might be a good start.
Not sure, if LinkedIn would detect Selenium. Most probably, yes.
But there should be a way to `automate it <https://piprogramming.org/articles/How-to-make-Selenium-undetectable-and-stealth--7-Ways-to-hide-your-Bot-Automation-from-Detection-0000000017.html>`_.

Conclusion
----------

In this article I used ChatGPT to generate recruiter's profile, reachout message, and gave it a test drive for talking to a candidate.
It also generate a first draft for a Python script to integrate with LinkedIn website.
Overall, this experiment gives me a good confidence, that this technology allows automating a lot of work for technical recruiters,
and with enough effort can even replace them.
