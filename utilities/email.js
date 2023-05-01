module.exports = { 
    // TODO: Use nodemailer to actually send an email.
    sendEmail: (sender, receiver, subject, message) => {
        console.log(
            '*********************************************************\n'
            + `To: ${receiver}\n`
            + `From: ${sender}\n`
            + `Subject: ${subject}\n`
            + '_________________________________________________________\n'
            + `${message}\n`
            + '*********************************************************\n'
        );
    },
}