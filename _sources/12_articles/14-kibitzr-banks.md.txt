# DIY Bank balance aggregation

I like to know what my credit card balance is.
And I don't want to visit all online bank accounts every day.
So I automated this process.
In a secure and reusable way.

I built my solution on top of [Kibitzr](https://kibitzr.github.io/) - self-hosted web scrapper.
It logs into online bank accounts and extracts balances.
Kibitzr has a [curated snippets collection](https://github.com/kibitzr/recipes/tree/master/banks).
So I picked the snippets for my banks and mashed them into one file:

```yaml
checks:
  - name: bofa
    url: https://www.bankofamerica.com/
    form:
      - id: onlineid1
        creds: keyring.bofa.username
      - id: passcode1
        creds: keyring.bofa.password
      - id: hp-sign-in-btn
        click: true
    delay: 5
    transform:
      - css-all: .balancevalue
      - text
    notify:
      - stash:
          bofa_checking: "{{ lines.0 }}" 
          bofa_savings: "{{ lines.1 }}" 
          bofa_credit: "{{ lines.2 }}" 
    period: 3 hours

  - name: discover
    url: https://www.discover.com/
    form:
      - id: userid
        creds: keyring.discover.username
      - id: password
        creds: keyring.discover.password
    delay: 5
    transform:
        - css: .current-balance
        - text
    notify:
      - stash:
          discover: "${{ content }}" 
    period: 3h

  - name: amex
    url: https://global.americanexpress.com/dashboard
    form:
        - id: lilo_username
          creds: keyring.amex.username
        - id: lilo_password
          creds: keyring.amex.password
        - id: lilo_formsubmit
          click: true
    delay: 10
    transform:
        - xpath: '//*[@id="root"]/div[1]//section//li[2]/div/div[2]/span'
        - text
    notify:
      - stash:
          amex: "{{ content }}" 
    period: 3h

  - name: summary
    script: echo dummy
    transform:
      - jinja: |
          {%- set bofa = stash.bofa_credit | float -%} 
          {%- set discover = stash.discover | float -%} 
          {%- set amex = stash.amex | float -%} 
          {%- set checking = stash.bofa_checking | float -%} 
          {%- set savings = stash.bofa_savings | float -%} 
          {%- set credits = bofa + discover + amex -%} 
          {%- set total = -bofa - discover - amex + checking + savings -%} 
          ```text
          checking     {{ '%10s' % stash.bofa_checking }}
          savings      {{ '%10s' % stash.bofa_savings }}
          credit cards:
              bofa     {{ '%10s' % stash.bofa_credit }}
              discover {{ '%10s' % stash.discover }}
              amex     {{ '%10s' % stash.amex }}
              *total*  {{ '%10s' % credits | dollars }}
          -----------------------
          balance      {{ '%10s' % total | dollars }}
          ```
      - changes: new 
    notify:
      - telegram
    period: 3 hours
```

Let me explain how it works.
There are 3 scrapping checks defined in this file: BofA, Discover, AmEx.
Each check opens one bank account, scrapes balance value, and saves it to stash.
Stash is a Kibitzr's persistent key-value storage.
In other words, it's a place where you can put data for later use.

The fourth check does the aggregation of all balances into one template and sends it
to my Telegram account. (Actually, it sends it to me and my wife private group).

All scrapping checks are alike, so I will break down the first one.

1. Check declares its name:
   ```yaml
   - name: BofA
   ```
2. Opens Firefox browser to open bank's home page:
   ```yaml
     url: https://www.bankofamerica.com/
   ```
3. Fills the form picking values from secure Operating System's keyring:
   ```yaml
     form:
       - id: onlineId1
         creds: keyring.bofa.username
       - id: passcode1
         creds: keyring.bofa.password
       - id: hp-sign-in-btn
         click: true
   ```
4. Waits for 5 seconds to let the dynamic dashboard load:
   ```yaml
     delay: 5
   ```
5. Extracts text from all HTML elements having CSS class `.balanceValue` assigned.
   ```yaml
     transform:
       - css-all: .balanceValue
       - text
   ```
6. I have 3 accounts in Bank of America: checking, savings, and credit.
   They always go in this order, so I stash their values under corresponding keys:
   ```yaml
     notify:
       - stash:
           bofa_checking: "{{ lines.0 }}"
           bofa_savings: "{{ lines.1 }}"
           bofa_credit: "{{ lines.2 }}"
   ```
7. This task runs every 3 hours:
   ```yaml
     period: 3 hours
   ```

Other 2 scrapping checks do the same thing for other banks.
After their execution I have all the data I need to create a report:

1. I called aggregation check Summary:
   ```yaml
   - name: Summary
   ```
2. It uses dummy bash fetcher. Because Kibitzr requires something to act as a fetcher.
   ```yaml
     script: echo dummy
   ```
3. Jinja template does all the heavy lifting.
   It looks scary at first sight. But on closer look, it's simple assigning and arithmetic.
   ```yaml
    transform:
      - jinja: |
          {%- set bofa = stash.bofa_credit | float -%} 
          {%- set discover = stash.discover | float -%} 
          {%- set amex = stash.amex | float -%} 
          {%- set checking = stash.bofa_checking | float -%} 
          {%- set savings = stash.bofa_savings | float -%} 
          {%- set credits = bofa + discover + amex -%} 
          {%- set total = -bofa - discover - amex + checking + savings -%} 
          ```text
          checking     {{ '%10s' % stash.bofa_checking }}
          savings      {{ '%10s' % stash.bofa_savings }}
          credit cards:
              bofa     {{ '%10s' % stash.bofa_credit }}
              discover {{ '%10s' % stash.discover }}
              amex     {{ '%10s' % stash.amex }}
              *total*  {{ '%10s' % credits | dollars }}
          -----------------------
          balance      {{ '%10s' % total | dollars }}
          ```
      - changes: new 
   ```
4. Finally, Kibitzr sends a shiny report through Telegram:
   ```yaml
     notify:
       - telegram
   ```

Then I saved my telegram bot credentials in `kibitzr-creds.yml`:

```yaml
telegram:
    token: 341530401:AABCRg_snz1554qkslIS8tMnNfWT3p5P80X
    chat: 926461341
```

I can't say that I composed the whole thing from the first attempt.
But after some tweaking and poking, I've got a working configuration,
that sends me notifications like this one:

![Balance report](images/balance.png)
