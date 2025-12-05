<?xml version="1.0" encoding="UTF-8" ?>
<xsl:stylesheet version="2.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:sm="http://www.sitemaps.org/schemas/sitemap/0.9">

<xsl:template match="/">
  <html xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <title>sitemap</title>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <style type="text/css">
      body {
        --fg: oklch(0.929 0.013 255.508);
        --bg: oklch(0.208 0.042 265.755);
        --acc: oklch(0.372 0.044 257.287);
        --link: oklch(0.769 0.188 70.08);
        --link-visited: oklch(0.685 0.169 237.323);
        background-color: var(--bg);
        color: var(--fg);
        font-family: "IBM Plex Sans JP", Arial, Helvetica, sans-serif;
      }

      a {
        color: var(--link);
      }

      a:visited {
        color: var(--link-visited);
      }

      table {
        border: none;
        border-collapse: collapse;
      }

      thead th {
        border-bottom: var(--fg) 1px solid;
      }

      tr, td, th {
        border: none
      }
    </style>
  </head>
  <body>
    <h1>Sitemap</h1>

    <table border="1">
      <thead>
        <tr>
          <th>URL</th>
          <th>Last modified</th>
        </tr>
      </thead>
      <tbody>
        <xsl:for-each select="sm:sitemapindex/sm:sitemap">
          <tr>
            <td>
              <a target="_blank">
                <xsl:attribute name="href">
                  <xsl:value-of select="sm:loc" />
                </xsl:attribute>
                <xsl:value-of select="sm:loc" />
              </a>
            </td>
            <td>
              <xsl:value-of select="sm:lastmod" />
            </td>
          </tr>
        </xsl:for-each>
        <xsl:for-each select="sm:urlset/sm:url">
          <tr>
            <td>
              <a target="_blank">
                <xsl:attribute name="href">
                  <xsl:value-of select="sm:loc" />
                </xsl:attribute>
                <xsl:value-of select="sm:loc" />
              </a>
            </td>
            <td>
              <xsl:value-of select="sm:lastmod" />
            </td>
          </tr>
        </xsl:for-each>
      </tbody>
    </table>
  </body>
</html>

</xsl:template>
</xsl:stylesheet>