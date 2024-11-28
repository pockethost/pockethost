<div class="prose">

# Privacy Policy

**Last Updated: October 5, 2024**

At PocketHost, we are committed to protecting your privacy and ensuring the security of your data. This Privacy Policy outlines how we collect, use, and safeguard your information when you use our services.

## 1. Introduction

PocketHost provides hosting services for PocketBase applications. By using our services, you agree to the collection and use of information in accordance with this policy.

## 2. Data Collection and Usage

### 2.1 Information We Collect

- **Personal Information**: We collect only the personal information that you voluntarily provide to us, such as your email address. This information is necessary for account creation, authentication, and communication purposes.

### 2.2 How We Use Your Information

- **Communication**: Your email address is used solely for transactional communications (like account confirmations, password resets, and service notifications) and for sending you updates about our services.

- **No Third-Party Sales**: We do not sell or rent your personal information to any third parties.

- **Authorized Third Parties**: We may share your information with third-party service providers who are authorized to communicate on our behalf, solely for the purpose of providing our services to you.

### 2.3 Aggregate Data

- **Public Statistics**: We may publish aggregate data such as user counts, instance counts, and other platform statistics. This information does not include any personally identifiable information and is used to inform the public about our platform's usage.

### 2.4 Anonymized Troubleshooting

- **Community Support**: Occasionally, we may discuss particular user behaviors on platforms like Discord for troubleshooting purposes. These discussions are always conducted anonymously to protect your identity.

## 3. Data Storage and Security

### 3.1 Hosting Environment

We utilize trusted third-party providers, **DigitalOcean** and **Fly.io**, to host our infrastructure.

#### DigitalOcean and Fly.io Security Measures

- **At-Rest Encryption**: Both providers offer encryption of volume storage at rest, protecting data against unauthorized physical access.

- **Network Security**: Advanced network security measures like firewalls and intrusion detection systems are employed.

- **Compliance Standards**: They comply with industry-leading security certifications and regulations such as GDPR, ISO 27001, and SOC 2 Type II.

- **Access Controls**: Strict access controls with multi-factor authentication and role-based permissions are in place.

- **Regular Backups and Redundancy**: Regular backups and redundant systems prevent data loss and ensure high availability.

### 3.2 PocketBase Instances

Each PocketBase instance runs in a secure Docker container with access only to its own data, enhancing security through isolation.

#### Data at Rest

- **Unencrypted Data Storage**: While VPS volumes are encrypted, data within each PocketBase instance—including SQLite databases and uploaded files—is stored unencrypted at rest due to PocketBase's lack of at-rest encryption support.

- **Potential Risks**: A breach of administrative access to the VPS could potentially expose unencrypted user data within your PocketBase instance.

### 3.3 SSH Security and Data Encryption

- **SSH Access**: Our servers are secured using 2048-bit SSH keys, ensuring that only authorized personnel can access them.

- **In-Flight Data Encryption**: All data transmitted between our servers is encrypted using industry-standard protocols, safeguarding against interception.

### 3.4 Use of Cloudflare

We utilize **Cloudflare** services to enhance security and performance.

- **Caching**: Cloudflare provides intelligent caching to improve load times.

- **Origin Security**: Acts as a reverse proxy, offering DDoS mitigation, Web Application Firewall (WAF) protection, and SSL/TLS encryption.

- **SSL/TLS Encryption**: All connections between end-users and Cloudflare are encrypted, ensuring secure data transmission.

### 3.5 Recommendations for Enhanced Security

- **Use of S3-Compatible Storage**: We strongly encourage users to configure PocketBase to use an S3-compatible storage service (like Amazon S3, Backblaze B2, or Wasabi) for file storage and backups, which offer encrypted at-rest storage.

- **Encrypted Backups**: Utilizing S3 storage for backups ensures that your data is encrypted during transit and at rest.

## 4. Cookies and Tracking Technologies

- **Authentication and Analytics**: We use cookies to manage user authentication and gather analytics to improve our services.

- **No Ad Tracking**: We do not use cookies or scripts for ad tracking or any similar purposes.

- **Opt-Out**: You can configure your browser settings to refuse cookies, but this may affect the functionality of our services.

## 5. Data Sharing and Disclosure

- **No Selling of Personal Data**: We do not sell or rent your personal information to anyone.

- **Third-Party Service Providers**: We may share your information with third-party service providers who assist us in operating our services, under strict confidentiality agreements.

- **Legal Requirements**: We may disclose your information if required to do so by law or in response to valid requests by public authorities.

## 6. User Rights

- **Access and Correction**: You have the right to access and correct your personal data at any time.

- **Data Portability**: You can request a copy of your data in a structured, machine-readable format.

- **Deletion**: You may request the deletion of your personal data, subject to certain legal obligations.

## 7. Changes to This Privacy Policy

We may update our Privacy Policy periodically. We will notify you of any significant changes by posting the new Privacy Policy on this page with an updated effective date.

## 8. Contact Us

If you have any questions or concerns about this Privacy Policy, please contact us at:

- **Email**: ben@pockethost.io
- **Address**: PO Box 871, Reno NV 89501.

</div>
