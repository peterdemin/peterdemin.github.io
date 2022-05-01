# IDK LOL

1. I called aggregation check Summary:
   ```yaml
   - name: Summary
   ```
2. It uses dummy bash fetcher. Because Kibitzr requires something to act as a fetcher.
   ```yaml
     script: echo dummy
   ```
3. All the heavy lifting is done inside Jinja template.
   It looks scary at first sight. But on closer look it's simple assigning and arithmetics.
   {% raw %}
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
           Checking     {{ '%10s' % stash.bofa_checking }}
           Savings      {{ '%10s' % stash.bofa_savings }}
           Credit cards:
               BofA     {{ '%10s' % stash.bofa_credit }}
               Discover {{ '%10s' % stash.discover }}
               AmEx     {{ '%10s' % stash.amex }}
               *Total*  {{ '%10s' % credits | dollars }}
           -----------------------
           Balance      {{ '%10s' % total | dollars }}
           ```
       - changes: new
   ```
   {% endraw %}
4. Finally, Kibitzr sends shiny report through Telegram:
   ```yaml
     notify:
       - telegram
   ```
