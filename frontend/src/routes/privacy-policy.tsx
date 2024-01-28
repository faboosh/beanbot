import { useEffect } from "react";
import styled from "styled-components";

const Container = styled.div`
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
`;

const PrivacyPolicy = () => {
  useEffect(() => {
    document.title = "BeanBot Privacy Policy";
  }, []);
  return (
    <Container className="p-3">
      <h1>Privacy Policy for BeanBot</h1>
      <p>
        <strong>Last updated:</strong> 2024-01-28
      </p>

      <p>
        Hello, I'm Fabian Johansson (@fabulo19), the developer behind BeanBot. I
        am committed to protecting your privacy and handling your data
        responsibly. This policy explains what information I collect, why I
        collect it, and how I use it.
      </p>

      <h2>Information I Collect</h2>
      <p>
        To provide and improve the bots music recommendations, I collect the
        following information:
      </p>
      <ul>
        <li>
          <strong>Plays:</strong>
          <ul>
            <li>The song that was played.</li>
            <li>When it was played.</li>
            <li>Your Discord user ID.</li>
            <li>The Discord server it was played in.</li>
          </ul>
        </li>
        <li>
          <strong>Skips:</strong>
          <ul>
            <li>The song that was skipped.</li>
            <li>When it was skipped.</li>
            <li>Your Discord user ID.</li>
            <li>The Discord server it was skipped in.</li>
          </ul>
        </li>
      </ul>
      <p>I do not store any other personal data beyond this.</p>

      <h2>Why I Collect This Data</h2>
      <p>
        - To offer personalized music recommendations based on your preferences.
      </p>
      <p>- To enhance the functionality of the bot.</p>
      <p>
        - To ensure a great user experience for everyone on the Discord server.
      </p>

      <h2>How I Use Your Data</h2>
      <p>
        - Your data is used solely to improve the music recommendation system.
      </p>
      <p>
        - I analyze song plays and skips to understand your music preferences.
      </p>
      <p>- Your data is not shared with any third parties.</p>

      <h2>Special Features and Data Usage</h2>
      <p>
        In addition to the basic functionality, the bot has a special command:
      </p>
      <ul>
        <li>
          <strong>/yt blame:</strong> This command reveals which users have
          played the currently playing song in the past on this server. It's a
          fun feature inspired by <code>git blame</code> and is used when users
          are curious about who queued the current song. This command is an
          example of how play history data is utilized to enhance user
          experience.
        </li>
      </ul>
      <p>
        Please note that when you play a song, your Discord user ID is
        associated with that song in the play history and can be displayed using
        the <code>/yt blame</code> command. This data is only available to users
        within the server where the song was played.
      </p>

      <h2>Your Control Over Your Data</h2>
      <p>You have complete control over your data. You can:</p>
      <ul>
        <li>Opt out of data collection.</li>
        <li>Request a copy of your data.</li>
        <li>Have your data deleted.</li>
      </ul>
      <p>Commands for these options are available through the bot.</p>

      <h2>Data Security</h2>
      <p>
        I take the security of your data seriously. Your data is stored securely
        and is accessed only for the purposes outlined in this policy.
      </p>

      <h2>Changes to This Policy</h2>
      <p>
        I may update this policy occasionally. I will inform you of any changes
        by posting the new policy in our Discord server.
      </p>

      <h2>Contact Me</h2>
      <p>
        If you have any questions about this policy or how I handle your data,
        please feel free to contact me via Discord at @fabulo19.
      </p>
    </Container>
  );
};

export default PrivacyPolicy;
