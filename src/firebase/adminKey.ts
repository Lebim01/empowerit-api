/* eslint-disable prettier/prettier */
export default process.env.NODE_ENV == 'production'
  ? {
      type: 'service_account',
      project_id: 'topx-academy',
      private_key_id: '60136ae563c277e96d76d9581c7ddb383451f676',
      private_key:
        '-----BEGIN PRIVATE KEY-----\nMIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQC2ar/KXwxqHX0/\n61JdZOm/BeJC9bBJo8vTKbu0leaSj14FxNwq+KbFxyTO8n+WhXphm0OUKrFUuJZX\nc6X9D2kkytVfrCUB7QQ6jqtYUMTNmdSlVSK8q/Qc1mD09IPsTFHczQysNJgS2Zd7\n9WSX7Q7S6nGAwaFO+uh+CQcnNx4NMYhsGqqMC9uIYEo6YAKCwQaDVNy3ATTpoJRv\n4s4ay8Lt5jAt7FbTL5UIMi6vh4MWN1M5sC8KW7zd/VC42pm25+WCyeNRu1ev96/g\n+MxZmzbVh8BJ1eauQu+PSqq9tWHrnClJ/90mdRB/q39oMZMwvztJAbY47C18mZ3C\nwKfDg5ghAgMBAAECggEADl5y7xOfnGLoRncDN5IcYMyrhE9qwdI3hab9lH2o+kB1\nd9+INuZRP2EEGD0Sfx59Ll/BlKlBlgUtlS6Uk6N5dR7ObJ6DEmzDbtgQIoEc5NPK\nOUpvKwzMdNJk3sa9TDQS0AwNhH8RajgI7l29Em6SQrDu8eUkD17vngXuB1EYepIb\nGvdzwbbXWmOGFEHG1wsWXM4CDklZ21I1MwcJebS70kTPbRn0datRwFjbrtkbNRtC\nMElCMtXAgUwJlwoSgTy2TqlGdY7LDO2HZ6kocWv6mBHsCXt4ic2bVHaeOpfNkceQ\nIAg47T1dPHrpW5M3Vpm5eBbQIpmu+fKJksAbWsQt8QKBgQDrsKOxt5M12l6pMBuY\nB0NdbXcmfTdzn1C9Ob9pNtmp3lU2mgd3rqkd7lFZokOioQlvgz/y/RM/ly6Hbflb\nnxk87KPZLgyJAiYGJsGNI9fA7J4GdOU2yZHNUAmNR1AQqn5JUo/OHWcDrgjGeaBR\n4H3Xm6wi6Px7ETNEJkYLzFeKtQKBgQDGIuX31HVJy2tZJUBYQjwMomb3nsybjVI+\nqTmRplxxNxMhc9LPQmwlKXPMhTeb2QOKo3kN2I4QUzHjozMnnQc68OtAw0R0zX6q\nenb7PjS5Kv2n4G+4FCA1b1e6Et36cWkoPT5Bgvc3D4y2ZSy5WMxevm3H36g1jcG3\n8z6Ee5E/PQKBgQCluzwgR7oYcEmIJvAAY3sXQ1Y5lmtbvneD2Auk7JD6RgEduAnw\nOr1o8p/5q4Rr41lDNMPPFe5nFOP/D3H8309b6/r7SMo/vWcHhFEt8jpQyxID8EcN\n04fXG6Tb132RepH69Tdx9HLvv30kM3psmLNk3W6ZzcNctqeaEF/JBBO60QKBgQCt\nXqH9HeFXJfCTe133HFWw9HXGnCQKxDi/7ZEbGgdvZTKPJerDQiqgxcm2nqaO7vAD\nYpEtBV0hebqApi+/rM5Dy8T90R7YWWtJPolXxBGcKLr1JxR6bNnWB8wqXBHx70SF\nWjlcV317p1aHzrW4pLOG/3fN2a001wo3rFb606i/PQKBgQCpxb5BouCt2M3C4buq\nkypZtAur4eEVaEeJPOvU/APNeXP1Kyd1m88sSSd66CtI+5o1i3SYSxh6753tr3H0\nMzVSL7Uu88WhGTjhG3S+IPz6NFD8PWGuGkcLXU3xEGpnN6fj7Gsm+Nk7pusMHaGQ\nEQrIWxv+3tzj9dJwPeXNVKkvMg==\n-----END PRIVATE KEY-----\n',
      client_email:
        'firebase-adminsdk-mgosk@topx-academy.iam.gserviceaccount.com',
      client_id: '104855631986353772459',
      auth_uri: 'https://accounts.google.com/o/oauth2/auth',
      token_uri: 'https://oauth2.googleapis.com/token',
      auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
      client_x509_cert_url:
        'https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-mgosk%40topx-academy.iam.gserviceaccount.com',
      universe_domain: 'googleapis.com',
    }
  : {
      type: 'service_account',
      project_id: 'topx-academy-dev',
      private_key_id: 'fa4645325967ad58706ff89e3aa36e583004d75e',
      private_key:
        '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCxnxbSwy4sQNEq\n2ck4/5JegwoNIkkJUg7NMAkY/wKk861wFSCAc0HS4NZSZ6TugL3epW6H2PuaBi76\nf0kZOZciVzo+8SWNzd6mv9mEEwUpP47yuLZE6aJft0z+tSwtGZOrm9Y/tSwf8x8W\nCQ+PFVprd5/9wDTPHMWJmDKpuMzr9Cj3DInmH9nguDxsUDgjZRzJVwZhX0CwtoCM\ncAoIZqhk/oCi0h1J8nAiW3xQI5T0kroB0I+8+99iSopG95dymD9A97TbOdYnT6kg\nG6f4w6Hef4YnK5iN4LXElfGgQfTgYw5UPNNOex0rFFR2TrKAx/YUSBqMkeZMRqp+\naHzs4sehAgMBAAECggEAEL8iJL74RH3b+sFL4o7eGwEZ2oEoB7Pv51KnGO86LZk3\n+gBT7yhuxVYjfuN8vmvu+uX4FODVYAFDPqTvnGw8nqVAvZx44PTPEEO4W2Z7rxbq\nAGJ/9OFeSM38eWtVfe8SaDSqL5mCToTaonY6PFBUFRvTPtZ3ZCufSEjMRgpBb+GN\ntPFuEW4nXQVG0jX74U+3vaJKt0DAN0sCeVwnpy5hCP8wUOQp5rpR6LnlJvOLh/jK\npgvptGEhPROE8lA5H+mRdWuPtLTYsFDVWEIMMr1EKhnRNl6H2HhveAWW3ebcmcs/\nFEwCu7xq9EopW64GQWvzGCzMsevmtoQ9pYGdJ7XIQQKBgQD2hdLQHoaL4XpHjZBd\nNUf855H9EhmRFHlZhd5z0Y7ikx02TLTp3JiA0WUoyOqSEGfjPCUTJHMjgLHJ2BCO\n9UhakDkAWkqAF8bSLKRxLNrdhNvGdaAJARQBmQKjt44Bi4F/npjicryOySs9aYcH\nhpt8NWt3f6ltxWBrh0KK1uFZmQKBgQC4cyrEzlfFGlpCnYEVgDcEO6w/EGcPRZkY\nwhllWoNpNO5zzh5pNWknqPgSSAMXC+1pu76jUkZLg0TlJc/QWGj8JAESX9mxaJa7\npPrSASt5babCoJxUzSE5jtdBVc0T/kGEH0jqnONGzWsSlPzzS/MII2R+UCAV/NAd\nf/ueF7TzSQKBgQCrJ9xmrFrjsUdReGLbo8t4NlqwZqmjhaB+3CfHJ55ZhqRId9c/\nau3iuf7O4zeg84z9QlvHP45E/uvw5HcSmg+C+RDqQsXoyxk6AM6m2OqX0882qaHT\nvpDiTxZ7Dkykm/Pr4/PnfJuXUuoXeDXMrtMy2G/lhpfeY6P+4+j6Nhg9OQKBgF9+\ncKQX2GUZcaWPeecxzEoKwvCbg1/qvoqM4y0QIXz0hIe8LQ53Movv9Q8x7TefWzkk\nlFxmGjK6MY8Zdm/9dc0krtFegoxRA8j+b0UOif2CAZY+JPHaidsM0vDmhRhWyICo\n2c1tkFV1wHuMWzFzHs4V1M94mEQJ8Y10V0bQK0TRAoGAGjkTITo946aeZVjhXbRA\nvt2A6gzgyy0YnZszDNbpkJpkhA3l2aSTAy+gUL+whMVYis8QHwFUbbQRpNfkJcPk\nf3LxU0teVlPWvER8odMeoZ75OeS+VRJRZux9Zj0k2Wdrbe4e0z0ZUS8gCIs9BhW5\ngmzlmEqmy6rqhqyvwlgClVs=\n-----END PRIVATE KEY-----\n',
      client_email:
        'firebase-adminsdk-73fz2@topx-academy-dev.iam.gserviceaccount.com',
      client_id: '117624016680041660719',
      auth_uri: 'https://accounts.google.com/o/oauth2/auth',
      token_uri: 'https://oauth2.googleapis.com/token',
      auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
      client_x509_cert_url:
        'https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-73fz2%40topx-academy-dev.iam.gserviceaccount.com',
      universe_domain: 'googleapis.com',
    };
