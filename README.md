# Carma Billing Usage Scraper

A web scraper using playwright to scrape your hydro usage from Carma Billing and
display it graphically (for example, as a panel for
[wtfutil](https://wtfutil.com/)). It only works if you access your hydro usage
at http://www.carmasmartmetering.com/DirectConsumptionDev/login.aspx.

```sh
Daily Consumption During April
Reading as of 2024-04-22
      20.00 ┼             ┌┐               
      18.00 ┼┐            ││            ┌┐ 
      16.00 ┤│            ││    ┌┐      ││ 
      14.00 ┤│     ┌┐     ││ ┌┐ │└┐     ││ 
      12.00 ┤│┌─┐ ┌┘│    ┌┘└┐││ │ │     ││ 
      10.00 ┼└┘─│┌┘─└┐───│──└┘│─│─└┐──┌─┘└ 
       8.00 ┤   ││   │┌─┐│    └─┘  │┌┐│    
       6.00 ┤   └┘   └┘ └┘         └┘└┘    
       4.00 ┤                              
       2.00 ┤                              
       0.00 ┤                              
  latest        10.7                          
  avg 5 days    11.18                         
  avg 30 days   10.88                         
  max           19.07                         
  min           5.44                          
  stddev        3.47                          
  last 5        10.70 18.53 10.07 10.03 6.56
```

# Usage

Install dependencies, set your credentials using `.env` or another mechanism, and run it.

```sh
yarn install --frozen-lockfile

# see .env.sample
echo 'CARMA_USERNAME="FOOBAR"' > .env
echo 'CARMA_PASSWORD="BAZ"' >> .env

./run.sh
```