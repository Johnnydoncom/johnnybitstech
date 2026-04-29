<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="2.0" 
                xmlns:html="http://www.w3.org/TR/REC-html40"
                xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
                xmlns:sitemap="http://www.sitemaps.org/schemas/sitemap/0.9"
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes"/>
  <xsl:template match="/">
    <html xmlns="http://www.w3.org/1999/xhtml">
      <head>
        <title>XML Sitemap | Johnnybits</title>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
        <style type="text/css">
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
            font-size: 14px;
            color: #333;
            max-width: 1000px;
            margin: 0 auto;
            padding: 40px 20px;
          }
          h1 {
            color: #1a1a1a;
            font-size: 24px;
            margin-bottom: 5px;
          }
          p.desc {
            color: #666;
            margin-bottom: 30px;
            font-size: 15px;
          }
          table {
            border: none;
            border-collapse: collapse;
            width: 100%;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          }
          thead th {
            text-align: left;
            background-color: #f8fafc;
            color: #475569;
            padding: 14px 16px;
            font-size: 13px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            border-bottom: 1px solid #e2e8f0;
          }
          tbody td {
            padding: 14px 16px;
            border-bottom: 1px solid #e2e8f0;
            background-color: #ffffff;
            color: #334155;
          }
          tbody tr:last-child td {
            border-bottom: none;
          }
          tbody tr:hover td {
            background-color: #f8fafc;
          }
          a {
            color: #2563eb;
            text-decoration: none;
            font-weight: 500;
          }
          a:hover {
            text-decoration: underline;
          }
          .badge {
            display: inline-flex;
            align-items: center;
            border-radius: 9999px;
            padding: 2px 10px;
            font-size: 12px;
            font-weight: 500;
            background-color: #f1f5f9;
            color: #475569;
          }
          .url-count {
            float: right;
            color: #64748b;
            font-size: 13px;
            font-weight: normal;
            margin-top: 8px;
          }
        </style>
      </head>
      <body>
        <h1>XML Sitemap</h1>
        <p class="desc">
          This is an XML Sitemap, meant for consumption by search engines like Google or Bing.
          <span class="url-count">
            <xsl:value-of select="count(sitemap:urlset/sitemap:url)"/> URLs in this sitemap
          </span>
        </p>
        <table>
          <thead>
            <tr>
              <th>URL</th>
              <th width="15%">Priority</th>
              <th width="15%">Change Frequency</th>
              <th width="20%">Last Modified</th>
            </tr>
          </thead>
          <tbody>
            <xsl:for-each select="sitemap:urlset/sitemap:url">
              <tr>
                <td>
                  <a href="{sitemap:loc}"><xsl:value-of select="sitemap:loc"/></a>
                </td>
                <td>
                  <span class="badge"><xsl:value-of select="sitemap:priority"/></span>
                </td>
                <td>
                  <xsl:value-of select="sitemap:changefreq"/>
                </td>
                <td>
                  <xsl:value-of select="substring(sitemap:lastmod, 0, 11)"/>
                  <span style="color:#94a3b8; font-size:12px; margin-left:4px;">
                    <xsl:value-of select="substring(sitemap:lastmod, 12, 5)"/>
                  </span>
                </td>
              </tr>
            </xsl:for-each>
          </tbody>
        </table>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
