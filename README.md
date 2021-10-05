# Deploying a Node Express Web App on AWS EC2 with CodeDeploy

## Fork the starter project

Felix Yu has a [great starter project](https://github.com/felixyu9/nodejs-express-on-aws-ec2) and accompanying [YouTube video](https://www.youtube.com/watch?v=Buh3GjHPmjo) where most of this info is from. Fork and clone the repo, then launch it locally with `node app.js` to make sure its working. Check `localhost:3000`.

## Setup AWS account

If you don't have an AWS account already, go to aws.amazon.com and register a new account. Like all of AWS, there is documentation available, but it can be a bit dense for beginners. [Click here](https://aws.amazon.com/premiumsupport/knowledge-center/create-and-activate-aws-account/) for a walkthrough.

You will want to follow [best practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html) when securing your new AWS root account. The main topics to pay attention to here are:

* Lock away your AWS account root user access keys.
* Enable MFA.

## Create IAM roles

Now that you have an account, you can start to setup your deployment infrastructure. This starts with creating Identity Access Management (IAM) roles that will allow AWS services to communicate with each other. 

### EC2 Role for CodeDeploy

This role will allow our [EC2 instance](#Create-an-EC2-instance) to talk to our [CodeDeploy](#Configure-codedeploy) service. The policy we are choosing here is managed by AWS so we don't have to configure much. 

1. Type IAM in the search bar and go to the service.
2. Click on roles in the sidebar and *Create New Role*. 
3. Choose EC2 as the use case. 
4. Select the policy named *AmazonEC2RoleforAWSCodeDeploy* . 
5. Skip setting tags.
6. Set name to be something like *EC2CodeDeployRole*.
7. Create!

### CodeDeploy Role

This role will allow our CodeDeploy service to talk to our EC2 instance. The policy we are choosing here is managed by AWS so we don't have to configure much. 

2. Go to the IAM service.
2. Click on roles in the sidebar and *Create New Role*. 
3. Choose CodeDeploy as the use case. 
4. There is only one policy available here: *AWSCodeDeployRole*. 
5. Skip setting tags.
6. Set name to be something like *CodeDeployRole*.
7. Create!

------

Your roles should look like this now:

<img src="https://github.com/geecrypt/nodejs-express-on-aws-ec2/blob/main/docs/IAM-roles.png" alt="urls" width="800">

## Create an EC2 instance

An Elastic Cloud Compute (EC2) instance is the type of cloud server we are used to. We can create a fully functional Linux machine and configure things like performance, storage, startup scripts, and [much more](https://aws.amazon.com/ec2).  EC2 sets itself apart from competitors by having the option to be highly scalable (elastic).  Most of the instance choices we make here are to stay within the [free tier](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/billing-free-tier.html) limits.

1. Navigate to the EC2 service and click *Launch Service*.
2. Choose image type as Amazon Linux 2 AMI. The image is the operating system and some default software.
3. Choose instance type as t2 micro. This is the hardware the server will run on.

3. Configure instance details. Select the EC2 IAM role created earlier. Scroll down and add startup scripts inside the *User Data* text box to launch the CodeDeploy Agent on instance spin up. Note that ruby is a dependency of CodeDeploy.

*User Data*

```bash
#!/bin/bash
sudo yum -y update
sudo yum -y install ruby
sudo yum -y install wget
cd /home/ec2-user
wget https://aws-codedeploy-us-east-1.s3.amazonaws.com/latest/install
sudo chmod +x ./install
sudo ./install auto
```

4. Add storage. Use the default Elastic Block Storage (EBS) configuration here.

5. Add tags. Add a name for the EC2 instance: `name : ExpressApp` .

6. Configure security groups.

* SSH : port 22: source `0.0.0.0/0` .
* HTTP: port 80, source: anywhere (`0.0.0.0/0, ::/0`) .
* Custom TCP: Port 3000 (this is our express app), source: anywhere (`0.0.0.0/0, ::/0`) .

7. Review instance config before launching and select a key pair. You may want to create a new pair here to avoid key re-use. Save this key (`.pem`) to a secure location.
8. Launch instance!

------

In your EC2 instance dashboard, you should see this:

<img src="https://github.com/geecrypt/nodejs-express-on-aws-ec2/blob/main/docs/ec2-instance.png" alt="urls" width="800">

## Testing instance

There's not too much testing we need to do at this point other than check that we can SSH into the EC2 instance. Using the key you saved earlier:

1. `chmod 400 my-key.pem` This is required to make the key file read-only, and readable only by the owner.
2. `ssh -i /path/my-key.pem my-instance-user-name@my-instance-public-dns-name` Replace the placeholders with your key file name and your instance details. The default EC2 instance user is `ec2-user`. The public DNS name can be found by going to *EC2* > *Instances* , clicking on your instance, and reading the *Public IPv4 DNS* name.
3. If everything is successful, you should be able to connect to your new box! If its not successful, happy googling :)

<img src="https://github.com/geecrypt/nodejs-express-on-aws-ec2/blob/main/docs/ssh.png" alt="urls" width="800">

## Configure deployment infrastructure

The next step is to configure the CodeDeploy and CodePipeline services to automatically deploy our code when we push to GitHub.

### CodeDeploy

1. Navigate to the CodeDeploy Service.
2. Create new application. Name it *express-app* and select EC2/On-prem.
3. Create a deployment group named express-app-group.

3. Set service role using the CodeDeploy IAM role created earlier.

4. Set Deployment type to be in-place - the simplest.

5. Select the EC2 instance created earlier.
6. Configure the deployment configuration to be AllAtOnce - again the simplest. There is no need for any load balancing since we only have one instance.

7. Create the deployment group!

After creating the CodeDeploy application, you should see this:

<img src="https://github.com/geecrypt/nodejs-express-on-aws-ec2/blob/main/docs/codedeploy.png" alt="urls" width="800">

### CodePipeline

1. Navigate to *Pipeline* in the CodeDeploy sidebar.
2. Configure pipeline initial settings. Set `name: express-app-pipeline`, and everything else as default.

2. Add source provider as GitHub v2 since our code is on GitHub.

3. Create a connection. Set `name: express-app-connection`. Click install new app then sign in with GitHub and select the express repo.

4. Choose the express repo and branch (main).
5. Skip the build stage config.
6. Add the deploy stage as CodeDeploy and select our app and deployment group.

7. Create pipeline!

Optional: You can review details and pipeline events by clicking on *View Events*.

You should see this if succesful:

<img src="https://github.com/geecrypt/nodejs-express-on-aws-ec2/blob/main/docs/codepipeline.png" alt="urls" width="800">

## Testing deployment

If everything was set up correctly, you should now be able to find your app on the world wide web.

1. Copy EC2 URL into the browser and go to port `3000` and `/products` .
2. Make changes to the app (e.g. change version text in `app.js`) and push to GitHub main branch.
3. Check CodeDeploy in the AWS management console to see a new deployment in progress.
4. Refresh the app page in your browser to see the update.

<img src="https://github.com/geecrypt/nodejs-express-on-aws-ec2/blob/main/docs/app.png" alt="urls" width="800">

## Create a budget

If this is a new AWS account, you will be in the free tier. However even the free tier has limits. Jeff needs to make a living somehow. Free tier accounts will be automatically notified with usage alerts when the service usage exceeds 80% of free tier quota. You can also see your *Top Free Tier Services by Usage* on your Billing homepage. For more details, see:

* https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/free-tier-limits.html
* https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/tracking-free-tier-usage.html

You can set up a daily budget to test other alert thresholds.

1. Navigate to Budgets.
2. Create new budget.
3. Set period to daily.
4. Set usage amount to 4hrs. Now if your EC2 instance is running nonstop, you should get alerts every day. You can modify this once you are confident with how AWS budgets work.

# PostgreSQL Setup

1. Use the **which** command to confirm that the **amazon-linux-extras** package is installed:

   ```bash
   $ which amazon-linux-extras
   ```

   Now follow this guide:

   https://techviewleo.com/install-postgresql-13-on-amazon-linux/

2. Enable Postgresql v13

   ```bash
   $ sudo amazon-linux-extras enable postgresql13
   ```

3. Install EPEL (needed for PostgreSQL RPMs on a Linux AMI 2 )

   ```bash
   $ sudo amazon-linux-extras install epel
   ```

4. Add the PGDG repo to your machine by running this command

   ``` bash
   $ sudo tee /etc/yum.repos.d/pgdg.repo<<EOF
   [pgdg13]
   name=PostgreSQL 13 for RHEL/CentOS 7 - x86_64
   baseurl=https://download.postgresql.org/pub/repos/yum/13/redhat/rhel-7-x86_64
   enabled=1
   gpgcheck=0
   EOF
   ```

   See also:

   https://wiki.postgresql.org/wiki/YUM_Installation

   https://yum.postgresql.org/repopackages/

5. Install the PostgreSQL client and server

   ```bash
   $ sudo yum install postgresql13 postgresql13-server
   ```

6. Generate initial DB config

   ```bash
   $ sudo /usr/pgsql-13/bin/postgresql-13-setup initdb
   ```

7. Start the service

   ```bash
   $ sudo systemctl start postgresql-13
   $ sudo systemctl enable postgresql-13
   $ sudo systemctl status postgresql-13
   ```

8. Login using superuser

   ```bash
   $ sudo su - postgres
   ```

9. Edit the `pga_hba.conf` to use password authentication with scram-sha-256

   ```bash
   $ vi /var/lib/pgsql/13/data/pg_hba.conf 
   ```

   ```conf
   # TYPE  DATABASE        USER            ADDRESS                 METHOD
   
   # "local" is for Unix domain socket connections only
   local   all             all                                     scram-sha-256
   # IPv4 local connections:
   host    all             all             127.0.0.1/32            scram-sha-256
   # IPv6 local connections:
   host    all             all             ::1/128                 scram-sha-256
   # Allow replication connections from localhost, by a user with the
   # replication privilege.
   local   replication     all                                     scram-sha-256
   host    replication     all             127.0.0.1/32            scram-sha-256
   host    replication     all             ::1/128                 scram-sha-256
   ```

   

   Log into the postgres client `psql` with peer (kernel) authentication. This is only possible since we haven't yet restarted the postgres service so our auth change hasn't taken efect.

   ```bash
   $ psql
   ```

   Set secure db admin password

   ```psql
   \password
   ```

   Enter your new password for default db admin user `postgres`

10. Exit out of psql and restart the postgres service

    ```bash
    $ sudo systemctl restart postgresql-13.service
    $ sudo systemctl status postgresql-13.service
    ```

11.  Try to run `psql` again and you will be prompted for a password

    ```bash
    -bash-4.2$ psql
    Password for user postgres: 
    ```

    Enter your newly created password.

12. Create a less privileged db user for your app to use

    ```psql
    CREATE ROLE rolename with LOGIN ENCRYPTED PASSWORD 'rolepassword';
    ```

13. Create a database with the new user as the owner. Easiest is to name the database the same as the role.

    ```bash
    CREATE DATABASE roledatabase OWNER rolename
    ```

14. Test that you can access this database as the new role. Logout of the postgres user and login as the new role.

    ```bash
    $ psql -U rolename
    ```



If everything has been successful so far, you have a secure setup of postgres to use with your app!

15. Now create a table and add some data so it can be retrieved from the app. This can be run from within `psql`.

    ```sql
    CREATE TABLE products (
    	id SERIAL PRIMARY KEY NOT NULL,
    	name VARCHAR(255) NOT NULL
    );
    
    INSERT INTO products (id, name)
    VALUES (1, 'car');
    
    INSERT INTO products (id, name)
    VALUES (2, 'laptop');
    ```

16.  







## Felix's original README

This repo hosts the source code for my YouTube tutorial on CI/CD from Github to an AWS EC2 instance via CodePipeline and CodeDeploy (https://www.youtube.com/watch?v=Buh3GjHPmjo). This tutorial uses a node.js express app as an example for the demo.

I also created a video to talk about how to fix some of the common CodeDeploy failures I have run into (https://www.youtube.com/watch?v=sXZVkOH6hrA). Below are a couple of examples:

```
ApplicationStop failed with exit code 1
```



```
The overall deployment failed because too many individual instances failed deployment, too few healthy instances are available for deployment, or some instances in your deployment group are experiencing problems.
```

===========================

EC2 script on creation to install the CodeDeploy Agent:

```
#!/bin/bash
sudo yum -y update
sudo yum -y install ruby
sudo yum -y install wget
cd /home/ec2-user
wget https://aws-codedeploy-us-east-1.s3.amazonaws.com/latest/install
sudo chmod +x ./install
sudo ./install auto
```

Check if CodeDeploy agent is running:
```
sudo service codedeploy-agent status
```

Location for CodeDeploy logs:
```
/opt/codedeploy-agent/deployment-root/deployment-logs/codedeploy-agent-deployments.log
```

Uninstall CodeDeploy Agent:
```
sudo yum erase codedeploy-agent
```
